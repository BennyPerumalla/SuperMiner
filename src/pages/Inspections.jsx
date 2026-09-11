import { useState } from "react";

function Inspections({ setActivePage }) {
  const [filter, setFilter] = useState("All");

  const inspections = [
    {
      id: "INS-2048",
      mine: "Mine A",
      type: "Safety Inspection",
      inspector: "R. Sharma",
      date: "Sep 12, 2026",
      priority: "Critical",
      status: "Overdue",
      findings: 5,
    },
    {
      id: "INS-2047",
      mine: "Mine C",
      type: "Environmental",
      inspector: "A. Das",
      date: "Sep 13, 2026",
      priority: "High",
      status: "Scheduled",
      findings: 3,
    },
    {
      id: "INS-2046",
      mine: "Mine B",
      type: "Routine Compliance",
      inspector: "S. Kumar",
      date: "Sep 14, 2026",
      priority: "Medium",
      status: "Scheduled",
      findings: 1,
    },
    {
      id: "INS-2045",
      mine: "Mine A",
      type: "Ventilation",
      inspector: "R. Sharma",
      date: "Sep 08, 2026",
      priority: "Critical",
      status: "In Progress",
      findings: 4,
    },
    {
      id: "INS-2044",
      mine: "Mine D",
      type: "Safety Inspection",
      inspector: "P. Singh",
      date: "Sep 06, 2026",
      priority: "Low",
      status: "Completed",
      findings: 0,
    },
  ];

  const filteredInspections = inspections.filter((inspection) => {
    return filter === "All" || inspection.status === filter;
  });

  return (
    <div className="inspections-page">

      {/* HEADER */}
      <div className="risk-page-header">
        <div>
          <span className="eyebrow">FIELD OPERATIONS</span>

          <h1>Inspections</h1>

          <p>
            Schedule, track and manage mine compliance inspections.
          </p>
        </div>

        <div className="risk-header-actions">
          <button className="secondary-btn">
            Inspection Calendar
          </button>

          <button className="primary-btn">
            + New Inspection
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <section className="risk-stats">

        <div className="risk-stat-card">
          <div className="risk-stat-icon">▣</div>

          <div>
            <span>TOTAL INSPECTIONS</span>
            <h2>128</h2>
            <p>This month</p>
          </div>
        </div>

        <div className="risk-stat-card risk-danger-card">
          <div className="risk-stat-icon">!</div>

          <div>
            <span>OVERDUE</span>
            <h2>08</h2>
            <p>Requires immediate action</p>
          </div>
        </div>

        <div className="risk-stat-card risk-warning-card">
          <div className="risk-stat-icon">◷</div>

          <div>
            <span>SCHEDULED</span>
            <h2>17</h2>
            <p>Upcoming inspections</p>
          </div>
        </div>

        <div className="risk-stat-card">
          <div className="risk-stat-icon">✓</div>

          <div>
            <span>COMPLETED</span>
            <h2>103</h2>
            <p>Completed this month</p>
          </div>
        </div>

      </section>

      {/* INSPECTION OVERVIEW */}
      <section className="inspection-overview-grid">

        <div className="panel inspection-priority-panel">

          <div className="panel-header">

            <div>
              <span className="eyebrow">
                AI PRIORITIZATION
              </span>

              <h2>Next Recommended Inspection</h2>
            </div>

            <span className="ai-badge">
              AI RECOMMENDED
            </span>

          </div>

          <div className="inspection-recommendation">

            <div className="inspection-priority-icon">
              !
            </div>

            <div className="inspection-recommendation-info">

              <span className="eyebrow">
                HIGHEST PRIORITY
              </span>

              <h3>Mine A — Safety Inspection</h3>

              <p>
                AI recommends immediate inspection based on elevated
                risk score, overdue inspections and unresolved violations.
              </p>

              <div className="inspection-tags">

                <span className="tag-critical">
                  Critical
                </span>

                <span>
                  Risk Score 82
                </span>

                <span>
                  5 Open Violations
                </span>

              </div>

            </div>
             <button
  className="primary-btn"
  onClick={() => setActivePage("Risk Intelligence")}
>
  Start →
</button>
            

          </div>

        </div>

        {/* INSPECTION STATUS */}
        <div className="panel inspection-status-panel">

          <div className="panel-header">

            <div>
              <span className="eyebrow">
                INSPECTION PIPELINE
              </span>

              <h2>Status</h2>
            </div>

          </div>

          <div className="inspection-status-list">

            <div>
              <span className="status-indicator completed-indicator"></span>
              <span>Completed</span>
              <strong>103</strong>
            </div>

            <div>
              <span className="status-indicator progress-indicator"></span>
              <span>In Progress</span>
              <strong>04</strong>
            </div>

            <div>
              <span className="status-indicator scheduled-indicator"></span>
              <span>Scheduled</span>
              <strong>17</strong>
            </div>

            <div>
              <span className="status-indicator overdue-indicator"></span>
              <span>Overdue</span>
              <strong>08</strong>
            </div>

          </div>

        </div>

      </section>

      {/* FILTER BAR */}
      <section className="panel inspection-filter-panel">

        <div>
          <span className="eyebrow">
            INSPECTION MANAGEMENT
          </span>

          <h2>Inspection Queue</h2>
        </div>

        <div className="inspection-filters">

          {["All", "Scheduled", "In Progress", "Overdue", "Completed"].map(
            (item) => (
              <button
                key={item}
                className={filter === item ? "filter-active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            )
          )}

        </div>

      </section>

      {/* INSPECTION TABLE */}
      <section className="panel inspection-table-panel">

        <div className="inspection-table-wrapper">

          <table className="inspection-table">

            <thead>
              <tr>
                <th>Inspection</th>
                <th>Mine</th>
                <th>Type</th>
                <th>Inspector</th>
                <th>Date</th>
                <th>Priority</th>
                <th>Findings</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {filteredInspections.map((inspection) => (

                <tr key={inspection.id}>

                  <td>
                    <div className="inspection-id">
                      <strong>{inspection.id}</strong>
                      <span>Field inspection</span>
                    </div>
                  </td>

                  <td>
                    <strong className="inspection-mine">
                      {inspection.mine}
                    </strong>
                  </td>

                  <td>
                    {inspection.type}
                  </td>

                  <td>
                    {inspection.inspector}
                  </td>

                  <td>
                    {inspection.date}
                  </td>

                  <td>
                    <span
                      className={`inspection-priority ${
                        inspection.priority === "Critical"
                          ? "priority-critical"
                          : inspection.priority === "High"
                          ? "priority-high"
                          : inspection.priority === "Medium"
                          ? "priority-medium"
                          : "priority-low"
                      }`}
                    >
                      {inspection.priority}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {inspection.findings}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`inspection-status ${
                        inspection.status === "Overdue"
                          ? "inspection-overdue"
                          : inspection.status === "In Progress"
                          ? "inspection-progress"
                          : inspection.status === "Completed"
                          ? "inspection-completed"
                          : "inspection-scheduled"
                      }`}
                    >
                      {inspection.status}
                    </span>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}

export default Inspections;