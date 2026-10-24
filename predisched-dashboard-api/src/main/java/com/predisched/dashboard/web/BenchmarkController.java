package com.predisched.dashboard.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.predisched.dashboard.DashboardProperties;
import com.predisched.dashboard.repo.Repositories;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Benchmark history, suite runs and the what-if simulator (spec §15.6; prompt 20). */
@RestController
public class BenchmarkController {

    private static final Pattern SIM = Pattern.compile("mean latency ([0-9.]+) ms, p95 ([0-9.]+)"
            + " ms, p99 ([0-9.]+) ms, throughput ([0-9.]+) tasks/s, makespan ([0-9.]+) ms,"
            + " imbalance ([0-9.]+), max queue ([0-9.]+), SLA violations ([0-9.]+) %");
    private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9_./:-]+");

    private final Repositories repo;
    private final Jobs jobs;
    private final DashboardProperties props;

    public BenchmarkController(Repositories repo, Jobs jobs, DashboardProperties props) {
        this.repo = repo;
        this.jobs = jobs;
        this.props = props;
    }

    @GetMapping("/api/benchmarks")
    public Map<String, Object> benchmarks(@RequestParam(defaultValue = "200") int limit)
            throws Exception {
        List<String> reports = new ArrayList<>();
        Path dir = jobs.root().resolve("results").resolve("benchmark");
        if (Files.isDirectory(dir)) {
            try (Stream<Path> suites = Files.list(dir)) {
                suites.filter(p -> Files.exists(p.resolve("report.html")))
                        .forEach(p -> reports.add("api/benchmarks/reports/" + p.getFileName()));
            }
        }
        int n = Math.max(1, Math.min(limit, 2_000));
        List<Map<String, Object>> suites = repo.suites();
        List<Map<String, Object>> runs = repo.benchmarks(n);
        String source = "database";
        if (suites.isEmpty() && Files.isDirectory(dir)) {
            runs = archivedRuns(dir);
            Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();
            for (Map<String, Object> run : runs) {
                String suite = String.valueOf(run.get("scenario")).split(":")[1];
                Map<String, Object> row = grouped.computeIfAbsent(suite, key -> {
                    Map<String, Object> value = new LinkedHashMap<>();
                    value.put("suite", key);
                    value.put("runs", 0);
                    value.put("started", run.get("created_at"));
                    value.put("finished", run.get("created_at"));
                    return value;
                });
                row.put("runs", ((Number) row.get("runs")).intValue() + 1);
                String at = String.valueOf(run.get("created_at"));
                if (Instant.parse(at).isBefore(Instant.parse(String.valueOf(row.get("started"))))) row.put("started", at);
                if (Instant.parse(at).isAfter(Instant.parse(String.valueOf(row.get("finished"))))) row.put("finished", at);
            }
            suites = new ArrayList<>(grouped.values());
            runs = runs.subList(0, Math.min(n, runs.size()));
            source = "archive";
        }
        return Map.of("suites", suites, "runs", runs, "reports", reports, "source", source);
    }

    /** Saved measurements retain their original dates; they are never presented as live runs. */
    private static List<Map<String, Object>> archivedRuns(Path dir) throws Exception {
        List<Map<String, Object>> runs = new ArrayList<>();
        ObjectMapper json = new ObjectMapper();
        try (Stream<Path> paths = Files.list(dir)) {
            for (Path suite : paths.filter(Files::isDirectory).sorted().toList()) {
                Path csv = suite.resolve("runs.csv");
                if (!Files.isRegularFile(csv)) continue;
                List<String> lines = Files.readAllLines(csv);
                if (lines.isEmpty()) continue;
                String[] header = lines.get(0).split(",");
                for (String line : lines.subList(1, lines.size())) {
                    if (line.isBlank()) continue;
                    String[] values = line.split(",", -1);
                    Map<String, String> fields = new LinkedHashMap<>();
                    for (int i = 0; i < header.length; i++) {
                        fields.put(header[i], i < values.length ? values[i] : "");
                    }
                    Map<String, Double> metrics = new LinkedHashMap<>();
                    for (String key : header) {
                        if (List.of("run_id", "index", "scenario", "strategy", "rep", "started_at")
                                .contains(key) || fields.get(key).isBlank()) continue;
                        double value = Double.parseDouble(fields.get(key));
                        if (Double.isFinite(value)) metrics.put(key, value);
                    }
                    runs.add(Map.of("run_id", fields.get("run_id"), "strategy", fields.get("strategy"),
                            "scenario", "benchmark:" + suite.getFileName() + ":" + fields.get("scenario"),
                            "created_at", Instant.ofEpochMilli(Long.parseLong(fields.get("started_at"))).toString(),
                            "metrics", json.writeValueAsString(metrics)));
                }
            }
        }
        return runs;
    }

    @GetMapping("/api/benchmarks/reports/{suite}")
    public ResponseEntity<FileSystemResource> report(@PathVariable String suite) {
        if (!suite.matches("[A-Za-z0-9_-]+")) throw new IllegalArgumentException("invalid suite");
        Path report = jobs.root().resolve("results/benchmark").resolve(suite).resolve("report.html");
        if (!Files.isRegularFile(report)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(new FileSystemResource(report));
    }

    /** Starts {@code run-suite} in the background; progress goes to the events topic. */
    @PostMapping("/api/benchmarks/run")
    public ResponseEntity<Map<String, Object>> run(
            @RequestBody(required = false) Map<String, Object> body) throws Exception {
        Map<String, Object> b = body == null ? Map.of() : body;
        List<String> command = new ArrayList<>(List.of(jobs.java(), "-jar",
                "predisched-benchmark/target/predisched-benchmark.jar", "run-suite", "--config",
                safe(String.valueOf(b.getOrDefault("config", "configs/benchmark.yaml"))),
                "--reps", String.valueOf(((Number) b.getOrDefault("reps", 1)).intValue())));
        if (b.containsKey("scenario")) {
            command.addAll(List.of("--scenario", safe(String.valueOf(b.get("scenario")))));
        }
        if (b.containsKey("suiteId")) {
            command.addAll(List.of("--suite-id", safe(String.valueOf(b.get("suiteId")))));
        }
        Jobs.Job job = jobs.start("benchmark", command);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("runId", job.id(),
                "command", String.join(" ", command), "progress", "/topic/events"));
    }

    @GetMapping("/api/benchmarks/jobs/{id}")
    public ResponseEntity<Object> job(@PathVariable String id) {
        Jobs.Job job = jobs.job(id);
        return job == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(job);
    }

    /** The prompt 20 simulator on a trace: a model, clearly labelled as one. */
    @PostMapping("/api/simulate")
    public Map<String, Object> simulate(@RequestBody Map<String, Object> body) throws Exception {
        List<String> command = new ArrayList<>(List.of(jobs.java(), "-jar",
                "predisched-benchmark/target/predisched-benchmark.jar", "simulate",
                "--trace", safe(String.valueOf(body.getOrDefault("trace",
                        "workloads/benchmark/heterogeneous-mixed-steady-2003.jsonl"))),
                "--strategy", safe(String.valueOf(body.getOrDefault("strategy", "least_loaded"))),
                "--speed", String.valueOf(((Number) body.getOrDefault("speed", 10)).doubleValue()),
                "--workers", safe(String.valueOf(body.getOrDefault("workers", "heterogeneous"))),
                "--seed", String.valueOf(((Number) body.getOrDefault("seed", 42)).longValue())));
        if (props.getClusterConfig() != null && !props.getClusterConfig().isBlank()) {
            command.addAll(List.of("--node-config", props.getClusterConfig()));
        }
        Jobs.Result r = jobs.run(command, jobs.root().toFile(), 120_000);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("simulation", true);
        out.put("note", "discrete-event model, not a measurement of the cluster (prompt 20)");
        Matcher m = SIM.matcher(r.output());
        if (r.exitCode() == 0 && m.find()) {
            String[] names = {"meanLatencyMs", "p95LatencyMs", "p99LatencyMs", "throughputPerSec",
                "makespanMs", "imbalance", "maxQueue", "slaViolationPct"};
            Map<String, Object> metrics = new LinkedHashMap<>();
            for (int i = 0; i < names.length; i++) {
                metrics.put(names[i], Double.parseDouble(m.group(i + 1)));
            }
            out.put("metrics", metrics);
        } else {
            out.put("error", "simulator exited " + r.exitCode());
        }
        out.put("output", r.output().strip());
        return out;
    }

    private static String safe(String value) {
        if (!SAFE.matcher(value).matches()) {
            throw new IllegalArgumentException("unsafe argument: " + value);
        }
        return value;
    }
}
