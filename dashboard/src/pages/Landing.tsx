import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import "../landing.css";

function Brand() {
  return <Link to="/" className="landing-brand" aria-label="PrediSched home">
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M6 7h8v7h8M6 21h8V7" stroke="currentColor" strokeWidth="1.7" />
      <rect x="2" y="3" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="2" y="17" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="18" y="10" width="8" height="8" rx="2" fill="currentColor" />
    </svg>
    <span>PrediSched<span className="landing-brand-period">.</span></span>
  </Link>;
}

function SystemDiagram() {
  return <figure className="landing-system">
    <div className="landing-system-heading"><span>Inside the scheduler</span><span>Illustrative architecture</span></div>
    <svg className="landing-system-svg" viewBox="0 0 560 440" role="img" aria-labelledby="system-title system-description">
      <title id="system-title">Tasks flow through the scheduler to a worker</title>
      <desc id="system-description">Incoming CPU, sort and HTTP tasks reach a primary scheduler with replicated backups. The scheduler uses worker metrics and optional predictions to place tasks on three workers.</desc>
      <defs>
        <marker id="landing-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6" fill="none" stroke="#7390a3" /></marker>
      </defs>
      <g className="landing-diagram-label"><text x="32" y="36">INCOMING WORK</text><text x="342" y="36">AVAILABLE WORKERS</text></g>
      <g className="landing-task-label">
        <rect x="32" y="60" width="110" height="38" rx="5" /><text x="46" y="84">CPU_TASK</text>
        <rect x="32" y="110" width="110" height="38" rx="5" /><text x="46" y="134">SORT_TASK</text>
        <rect x="32" y="160" width="110" height="38" rx="5" /><text x="46" y="184">HTTP_TASK</text>
      </g>
      <g fill="none" stroke="#496172" strokeWidth="1.2">
        <path d="M142 79h25v76h34M142 129h25M142 179h25v-24" />
        <path d="M291 155h28V90h30M319 155h30M319 155v65h30" markerEnd="url(#landing-arrow)" />
        <path d="M246 191v48m-37 0h74m-74 0v15m37-15v15m37-15v15" strokeDasharray="3 5" />
        <path d="M245 333v-41M291 155h14v178h-22" stroke="#3588ff" strokeDasharray="3 5" />
      </g>
      <g className="landing-primary">
        <rect x="200" y="117" width="92" height="74" rx="8" />
        <path d="M219 138h10m-10 7h20m-20 7h15" stroke="white" strokeWidth="1.5" />
        <text x="217" y="177">Primary</text>
      </g>
      <g className="landing-backup"><rect x="197" y="254" width="24" height="24" rx="4" /><rect x="234" y="254" width="24" height="24" rx="4" /><rect x="271" y="254" width="24" height="24" rx="4" /></g>
      <text x="201" y="301" className="landing-small-label">Replicated state</text>
      <g className="landing-worker">
        <rect x="349" y="65" width="177" height="50" rx="6" /><text x="365" y="87">Worker 01</text>
        <rect x="349" y="130" width="177" height="50" rx="6" /><text x="365" y="152">Worker 02</text>
        <rect x="349" y="195" width="177" height="50" rx="6" /><text x="365" y="217">Worker 03</text>
      </g>
      <g fill="#496172"><rect x="365" y="96" width="15" height="4" rx="1" /><rect x="384" y="96" width="15" height="4" rx="1" /><rect x="365" y="161" width="15" height="4" rx="1" /><rect x="384" y="161" width="15" height="4" rx="1" /><rect x="403" y="161" width="15" height="4" rx="1" /><rect x="422" y="161" width="15" height="4" rx="1" /><rect x="365" y="226" width="15" height="4" rx="1" /><rect x="384" y="226" width="15" height="4" rx="1" /><rect x="403" y="226" width="15" height="4" rx="1" /><rect x="422" y="226" width="15" height="4" rx="1" /><rect x="441" y="226" width="15" height="4" rx="1" /><rect x="460" y="226" width="15" height="4" rx="1" /></g>
      <g className="landing-prediction"><rect x="174" y="333" width="149" height="44" rx="6" /><circle cx="193" cy="355" r="4" fill="#73aaff" /><text x="207" y="360">Prediction engine</text></g>
      <text x="350" y="292" className="landing-small-label">Metrics inform placement.</text>
      <text x="350" y="310" className="landing-small-label">Workers execute the task.</text>
      <circle r="3.5" fill="#b4d3ff" className="landing-flow-packet" />
      <text x="32" y="415" className="landing-small-label">gRPC between services · heartbeats from every worker</text>
    </svg>
    <div className="landing-mobile-system" role="img" aria-label="Incoming tasks reach a primary scheduler with replicated backups, then one of three workers. Predictions and worker metrics inform placement.">
      <p className="landing-mobile-label">Incoming work</p>
      <div className="landing-mobile-tasks"><span>CPU</span><span>Sort</span><span>HTTP</span></div>
      <ArrowDown className="landing-mobile-arrow" size={21} aria-hidden="true" />
      <div className="landing-mobile-primary"><strong>Primary scheduler</strong><span>Replicated backups</span></div>
      <ArrowDown className="landing-mobile-arrow" size={21} aria-hidden="true" />
      <div className="landing-mobile-workers"><span>Worker 1</span><span>Worker 2</span><span>Worker 3</span></div>
      <p className="landing-mobile-feedback">Predictions and worker metrics inform placement.</p>
    </div>
    <figcaption><span className="landing-diagram-key"><i />Task placement</span><span className="landing-diagram-key"><i />Prediction feedback</span></figcaption>
  </figure>;
}

const capabilities = [
  { title: "Follow the work.", text: "From submission to completion, trace tasks across workers. See queue depth, active threads, execution times, and the events behind them.", detail: "Live cluster · Task history · Event stream" },
  { title: "Understand the decision.", text: "Inspect predicted execution time, queue delay, and overload risk. See which worker was selected and when the scheduler used a fallback.", detail: "Predictive placement · Decision explanations" },
  { title: "Put it to the test.", text: "Compare scheduling strategies using recorded benchmarks. Explore a what-if simulation, or run the guided demo to watch primary failover happen.", detail: "Benchmarks · Simulation · Fault injection" },
];

export function LandingPage() {
  return <div className="landing-page">
    <a className="landing-skip" href="#main">Skip to content</a>
    <header className="landing-header landing-width">
      <Brand />
      <nav aria-label="Site navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#capabilities">Explore</a>
        <a href="https://github.com/nipunalwala/predisched" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={14} /></a>
      </nav>
      <Link className="landing-header-action" to="/dashboard">Open dashboard<ArrowUpRight size={17} /></Link>
    </header>

    <main id="main">
      <section className="landing-hero landing-width" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <h1 id="landing-title">Every task.<br /><span>In clear view.</span></h1>
          <p className="landing-hero-description">A live workspace for distributed task scheduling. Submit work, understand placement decisions, and watch your cluster respond.</p>
          <Link to="/dashboard" className="landing-button">Open dashboard<ArrowUpRight size={21} /></Link>
          <a className="landing-architecture-link" href="#how-it-works">Take a closer look<ArrowDown size={15} /></a>
        </div>
        <SystemDiagram />
      </section>

      <div className="landing-stack landing-width" aria-label="Technology">
        <span>One connected system.</span>
        <div><span>Java + gRPC</span><span>Python predictions</span><span>React dashboard</span></div>
      </div>

      <section id="how-it-works" className="landing-process landing-width" aria-labelledby="process-title">
        <div className="landing-section-intro"><h2 id="process-title">Distributed systems.<br /><span>Without the black box.</span></h2><p>The scheduler, its backups, and the workers are parts of the same story. PrediSched makes their interactions visible.</p></div>
        <ol className="landing-steps">
          <li><span className="landing-step-number">1</span><h3>Submit a workload</h3><p>Send individual tasks or replay a saved workload across different resource profiles.</p></li>
          <li><span className="landing-step-number">2</span><h3>Place and execute</h3><p>The primary scheduler selects a worker using the active scheduling strategy.</p></li>
          <li><span className="landing-step-number">3</span><h3>Inspect what happened</h3><p>Follow metrics, task outcomes, and scheduling decisions in the live dashboard.</p></li>
        </ol>
      </section>

      <section id="capabilities" className="landing-capabilities" aria-label="What you can explore">
        <div className="landing-width">
          {capabilities.map((item) => <article className="landing-capability" key={item.title}>
            <h2>{item.title}</h2><div><p>{item.text}</p><span>{item.detail}</span></div>
          </article>)}
        </div>
      </section>

      <section className="landing-close landing-width" aria-labelledby="close-title">
        <div><h2 id="close-title">The next step is inside.</h2><p>Explore the cluster, run a workload, and follow the decisions.</p></div>
        <Link to="/dashboard" className="landing-button">Open dashboard<ArrowRight size={20} /></Link>
      </section>
    </main>

    <footer className="landing-footer landing-width"><Brand /><p>Predict. Schedule. Observe.</p><a href="https://github.com/nipunalwala/predisched" target="_blank" rel="noreferrer">View the source<ArrowUpRight size={15} /></a></footer>
  </div>;
}
