package com.predisched.dashboard.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Read-only evidence behind the benchmark and prediction report panels. */
@RestController
public class ReportController {
    private final Jobs jobs;

    public ReportController(Jobs jobs) {
        this.jobs = jobs;
    }

    private static void identifier(String value) {
        if (!value.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("invalid report identifier");
        }
    }

    private static List<Map<String, String>> csv(Path file) throws IOException {
        List<String> lines = Files.readAllLines(file);
        if (lines.isEmpty()) return List.of();
        String[] headers = lines.get(0).split(",", -1);
        List<Map<String, String>> rows = new ArrayList<>();
        for (String line : lines.subList(1, lines.size())) {
            if (line.isBlank()) continue;
            String[] values = line.split(",", -1);
            Map<String, String> row = new LinkedHashMap<>();
            for (int i = 0; i < headers.length; i++) {
                row.put(headers[i], i < values.length ? values[i] : "");
            }
            rows.add(row);
        }
        return rows;
    }

    private static final class Samples {
        final TreeMap<Double, Integer> counts = new TreeMap<>();
        int runs;
        int tasks;

        Map<String, Object> response(String strategy) {
            List<Map<String, Object>> points = new ArrayList<>();
            int cumulative = 0;
            for (Map.Entry<Double, Integer> entry : counts.entrySet()) {
                cumulative += entry.getValue();
                points.add(Map.of("latencyMs", entry.getKey(), "cumulativePct", 100.0 * cumulative / tasks));
            }
            return Map.of("strategy", strategy, "runs", runs, "tasks", tasks, "points", points);
        }
    }

    /** Exact empirical CDF of completed tasks; all recorded samples, including warm-up. */
    @GetMapping("/api/benchmarks/{suite}/latency-cdf")
    public Map<String, Object> latencyCdf(@PathVariable String suite) throws IOException {
        identifier(suite);
        Path dir = jobs.root().resolve("results/benchmark").resolve(suite);
        Path index = dir.resolve("runs.csv");
        Map<String, Map<String, Samples>> scenarios = new LinkedHashMap<>();
        int missingRuns = 0;
        if (Files.isRegularFile(index)) {
            for (Map<String, String> run : csv(index)) {
                String id = run.getOrDefault("run_id", "");
                if (!id.matches("[A-Za-z0-9_-]+")) { missingRuns++; continue; }
                Path tasks = dir.resolve("runs").resolve(id + ".csv");
                if (!Files.isRegularFile(tasks)) { missingRuns++; continue; }
                String scenario = run.getOrDefault("scenario", "");
                String strategy = run.getOrDefault("strategy", "");
                if (scenario.isBlank() || strategy.isBlank()) continue;
                Samples samples = scenarios.computeIfAbsent(scenario, key -> new LinkedHashMap<>())
                        .computeIfAbsent(strategy, key -> new Samples());
                samples.runs++;
                for (Map<String, String> task : csv(tasks)) {
                    if (!"COMPLETED".equals(task.get("status"))) continue;
                    try {
                        double latency = Double.parseDouble(task.getOrDefault("latency_ms", ""));
                        if (!Double.isFinite(latency) || latency < 0) continue;
                        samples.counts.merge(latency, 1, Integer::sum);
                        samples.tasks++;
                    } catch (NumberFormatException ignored) {
                        // A missing/invalid measurement contributes no invented latency.
                    }
                }
            }
        }
        List<Map<String, Object>> result = new ArrayList<>();
        scenarios.forEach((name, strategies) -> {
            List<Map<String, Object>> series = new ArrayList<>();
            strategies.forEach((strategy, samples) -> {
                if (samples.tasks > 0) series.add(samples.response(strategy));
            });
            if (!series.isEmpty()) result.add(Map.of("scenario", name, "strategies", series));
        });
        return Map.of("suite", suite, "source", "archive", "missingRuns", missingRuns, "scenarios", result);
    }

    @GetMapping("/api/models/{model}/feature-importance")
    public Map<String, Object> featureImportance(@PathVariable String model) throws IOException {
        if (!model.matches("m[123]")) throw new IllegalArgumentException("invalid model");
        Path models = jobs.root().resolve("ml/models");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("model", model);
        result.put("source", "live-registry");
        result.put("available", false);
        result.put("features", List.of());
        result.put("message", "The live model's feature weights are not available yet.");
        Path registry = models.resolve("registry.json");
        if (!Files.isRegularFile(registry)) return result;
        ObjectMapper json = new ObjectMapper();
        JsonNode entry = json.readTree(registry.toFile()).path("models").path(model);
        String live = entry.path("live").asText();
        if (!live.matches("[1-9][0-9]*")) return result;
        result.put("version", Long.parseLong(live));
        for (JsonNode version : entry.path("versions")) {
            if (version.path("version").asText().equals(live)) {
                result.put("candidate", version.path("kept").asText(""));
            }
        }
        Path weights = models.resolve(model).resolve("v" + live).resolve("feature-importance.json");
        if (!Files.isRegularFile(weights)) return result;
        JsonNode report = json.readTree(weights.toFile());
        List<Map<String, Object>> features = new ArrayList<>();
        for (JsonNode feature : report.path("features")) {
            String name = feature.path("feature").asText();
            JsonNode value = feature.path("importance");
            if (!name.isBlank() && value.isNumber() && Double.isFinite(value.asDouble()) && value.asDouble() >= 0) {
                features.add(Map.of("feature", name, "importance", value.asDouble()));
            }
        }
        result.put("method", report.path("method").asText());
        result.put("features", features);
        result.put("available", !features.isEmpty());
        if (!features.isEmpty()) result.remove("message");
        return result;
    }
}
