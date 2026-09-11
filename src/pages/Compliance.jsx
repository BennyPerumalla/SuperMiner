import { useState } from "react";

function Compliance() {
  const [selectedMine, setSelectedMine] = useState("Mine A");

  const complianceData = {
    "Mine A": {
      score: 48,
      status: "Critical",
      violations: 5,
      pending: 8,
      overdue: 3,
      actions: 4,
    },
    "Mine B": {
      score: 84,
      status: "Compliant",
      violations: 1,
      pending: 2,
      overdue: 0,
      actions: 1,
    },
    "Mine C": {
      score: 67,
      status: "Needs Attention",
      violations: 3,
      pending: 5,
      overdue: 1,
      actions: 2,
    },
  };

  const mine = complianceData[selectedMine];

  const requirements = [
    {
      name: "Safety & Ventilation",
      description: "Ventilation monitoring and safety controls",
      progress: 42,
      status: "Critical",
    },
    {
      name: "Environmental Compliance",
      description: "Air, water and environmental monitoring",
      progress: 64,
      status: "Attention",
    },
    {
      name: "Worker Safety",
      description: "PPE, training and workplace safety",
      progress: 78,
      status: "Good",
    },
    {
      name: "Operational Records",
      description: "Required operational documentation",
      progress: 91,
      status: "Good",
    },
  ];

  const violations = [
    {
      id: "V-1024",
      title: "Ventilation inspection overdue",
      mine: "Mine A",
      severity: "Critical",
      age: "2 days",
    },
    {
      id: "V-1021",
      title: "Safety training records incomplete",
      mine: "Mine A",
      severity: "High",
      age: "4 days",
    },
    {
      id: "V-1017",
      title: "Environmental report pending",
      mine: "Mine C",
      severity: "Medium",
      age: "6 days",
    },
  ];

  return (
    <div className="compliance-page">

      {/* HEADER */}
      <div className="risk-page-header">
        <div>
          <span className="eyebrow">REGULATORY COMPLIANCE</span>

          <h1>Compliance Intelligence</h1>

          <p>
            Monitor regulatory obligations, violations and corrective actions.
          </p>
        </div>

        <div className="risk-header-actions">
          <button className="secondary-btn">
            Export Report
          </button>

          <button className="primary-btn">
            Run Compliance Check
          </button>
        </div>
      </div>

      {/* MINE SELECTOR */}
      <section className="panel compliance-selector">

        <div>
          <span className="eyebrow">MONITORED MINE</span>

          <h2>{selectedMine}</h2>

          <p>
            Compliance assessment based on current regulatory indicators.
          </p>
        </div>

        <select
          value={selectedMine}
          onChange={(e) => setSelectedMine(e.target.value)}
          className="compliance-select"
        >
          <option>Mine A</option>
          <option>Mine B</option>
          <option>Mine C</option>
        </select>

      </section>

      {/* KPI CARDS */}
      <section className="risk-stats">

        <div className="risk-stat-card">
          <div className="risk-stat-icon">%</div>

          <div>
            <span>COMPLIANCE SCORE</span>

            <h2>{mine.score}%</h2>

            <p>
              {mine.status}
            </p>
          </div>
        </div>

        <div className="risk-stat-card risk-danger-card">
          <div className="risk-stat-icon">!</div>

          <div>
            <span>OPEN VIOLATIONS</span>

            <h2>{mine.violations}</h2>

            <p>Requires resolution</p>
          </div>
        </div>

        <div className="risk-stat-card risk-warning-card">
          <div className="risk-stat-icon">◷</div>

          <div>
            <span>PENDING ITEMS</span>

            <h2>{mine.pending}</h2>

            <p>Awaiting action</p>
          </div>
        </div>

        <div className="risk-stat-card">
          <div className="risk-stat-icon">✓</div>

          <div>
            <span>CORRECTIVE ACTIONS</span>

            <h2>{mine.actions}</h2>

            <p>Active action plans</p>
          </div>
        </div>

      </section>

      {/* MAIN COMPLIANCE AREA */}
      <section className="compliance-main-grid">

        {/* SCORE */}
        <div className="panel compliance-score-panel">

          <div className="panel-header">

            <div>
              <span className="eyebrow">
                AI COMPLIANCE ASSESSMENT
              </span>

              <h2>Overall Compliance</h2>
            </div>

            <span
              className={`compliance-status ${
                mine.score < 60
                  ? "compliance-critical"
                  : mine.score < 80
                  ? "compliance-attention"
                  : "compliance-good"
              }`}
            >
              {mine.status}
            </span>

          </div>

          <div className="compliance-score-content">

            <div className="compliance-circle">

              <div>
                <strong>{mine.score}</strong>
                <span>/100</span>
              </div>

            </div>

            <div className="compliance-score-text">

              <h3>
                {mine.score < 60
                  ? "Immediate intervention required"
                  : mine.score < 80
                  ? "Improvement required"
                  : "Compliance is on track"}
              </h3>

              <p>
                The AI assessment combines regulatory requirements,
                inspection findings, violations and corrective-action status.
              </p>

            </div>

          </div>

          <div className="compliance-progress">

            <div
              style={{
                width: `${mine.score}%`,
              }}
            ></div>

          </div>

          <div className="compliance-scale">
            <span>0 — Critical</span>
            <span>60 — Attention</span>
            <span>80 — Good</span>
            <span>100 — Compliant</span>
          </div>

        </div>

        {/* AI INSIGHT */}
        <div className="panel compliance-ai-panel">

          <span className="eyebrow">
            AI COMPLIANCE INSIGHT
          </span>

          <div className="recommendation-icon">
            ✦
          </div>

          <h2>Priority Recommendation</h2>

          <p>
            {mine.score < 60
              ? `${selectedMine} has a critical compliance gap. Prioritize overdue
                 inspections and unresolved safety violations before the next
                 regulatory review.`
              : mine.score < 80
              ? `${selectedMine} shows moderate compliance risk. Focus on pending
                 corrective actions and upcoming regulatory deadlines.`
              : `${selectedMine} is maintaining strong compliance. Continue routine
                 monitoring and close the remaining open items.`}
          </p>
        <button className="primary-btn full-btn">
          Create Corrective Action →
        </button> 

        </div>

      </section>

      {/* REQUIREMENTS */}
      <section className="panel compliance-requirements-panel">

        <div className="panel-header">

          <div>
            <span className="eyebrow">
              REGULATORY FRAMEWORK
            </span>

            <h2>Compliance Requirements</h2>
          </div>

          <span className="mine-count">
            4 categories monitored
          </span>

        </div>

        <div className="requirement-list">

          {requirements.map((item, index) => (

            <div className="requirement-item" key={index}>

              <div className="requirement-number">
                0{index + 1}
              </div>

              <div className="requirement-info">

                <strong>{item.name}</strong>

                <p>{item.description}</p>

              </div>

              <div className="requirement-progress">

                <div className="requirement-progress-top">

                  <strong>{item.progress}%</strong>

                  <span
                    className={
                      item.status === "Critical"
                        ? "high-text"
                        : item.status === "Attention"
                        ? "medium-text"
                        : "low-text"
                    }
                  >
                    {item.status}
                  </span>

                </div>

                <div className="mini-progress requirement-bar">

                  <div
                    style={{
                      width: `${item.progress}%`,
                    }}
                  ></div>

                </div>

              </div>

            </div>

          ))}

        </div>

      </section>

      {/* VIOLATIONS */}
      <section className="panel violations-panel">

        <div className="panel-header">

          <div>
            <span className="eyebrow">
              NON-COMPLIANCE
            </span>

            <h2>Open Violations</h2>
          </div>

          <span className="mine-count">
            {mine.violations} active
          </span>

        </div>

        <div className="violation-list">

          {violations
            .filter(
              (violation) =>
                violation.mine === selectedMine
            )
            .map((violation) => (

              <div
                className="violation-item"
                key={violation.id}
              >

                <div className="violation-severity">
                  <span
                    className={
                      violation.severity === "Critical"
                        ? "severity-critical"
                        : violation.severity === "High"
                        ? "severity-high"
                        : "severity-medium"
                    }
                  ></span>
                </div>

                <div className="violation-info">

                  <strong>
                    {violation.title}
                  </strong>

                  <p>
                    {violation.id} • Reported {violation.age} ago
                  </p>

                </div>

                <span
                  className={`violation-badge ${
                    violation.severity === "Critical"
                      ? "badge-critical"
                      : violation.severity === "High"
                      ? "badge-high"
                      : "badge-medium"
                  }`}
                >
                  {violation.severity}
                </span>

                <button
                   className="view-evidence-btn"
                   onClick={() => window.dispatchEvent(new CustomEvent("navigate-page", { detail: "Inspections" }))}
                   >
                   View →
                  </button>

              </div>

            ))}

        </div>

      </section>

    </div>
  );
}

export default Compliance;