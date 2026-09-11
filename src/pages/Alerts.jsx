import { useState } from "react";

function Alerts() {
  const [filter, setFilter] = useState("All");

  const alerts = [
    {
      id: "ALT-3021",
      title: "Critical Safety Violation",
      description:
        "Repeated ventilation observation detected during recent inspection.",
      mine: "Mine A",
      severity: "Critical",
      source: "Inspection AI",
      time: "15 min ago",
      action: "Immediate inspection recommended",
    },
    {
      id: "ALT-3019",
      title: "Inspection Overdue",
      description:
        "Scheduled safety inspection has exceeded the required deadline.",
      mine: "Mine C",
      severity: "High",
      source: "Compliance Engine",
      time: "1 hour ago",
      action: "Schedule inspection",
    },
    {
      id: "ALT-3016",
      title: "Compliance Action Pending",
      description:
        "Corrective action remains unresolved beyond the expected closure date.",
      mine: "Mine B",
      severity: "Medium",
      source: "Compliance Engine",
      time: "3 hours ago",
      action: "Review corrective action",
    },
    {
      id: "ALT-3014",
      title: "Contractor Risk Increased",
      description:
        "Contractor compliance performance declined over the previous assessment period.",
      mine: "Mine A",
      severity: "High",
      source: "AI Risk Model",
      time: "5 hours ago",
      action: "Review contractor",
    },
    {
      id: "ALT-3011",
      title: "Environmental Report Due",
      description:
        "Required environmental documentation is approaching its submission deadline.",
      mine: "Mine C",
      severity: "Medium",
      source: "Compliance Engine",
      time: "7 hours ago",
      action: "Upload documentation",
    },
    {
      id: "ALT-3008",
      title: "Routine Monitoring Complete",
      description:
        "Scheduled monitoring cycle completed without critical findings.",
      mine: "Mine D",
      severity: "Low",
      source: "Monitoring System",
      time: "Yesterday",
      action: "No action required",
    },
  ];

  const filteredAlerts = alerts.filter((alert) => {
    return filter === "All" || alert.severity === filter;
  });

  return (
    <div className="alerts-page">

      {/* HEADER */}
      <div className="risk-page-header">
        <div>
          <span className="eyebrow">COMMAND & MONITORING</span>

          <h1>Alerts & Events</h1>

          <p>
            Monitor AI-detected compliance, safety and operational events.
          </p>
        </div>

        <div className="risk-header-actions">
          <button className="secondary-btn">
            Export Events
          </button>

          <button className="primary-btn">
            Configure Alerts
          </button>
        </div>
      </div>

      {/* ALERT SUMMARY */}
      <section className="risk-stats">

        <div className="risk-stat-card risk-danger-card">
          <div className="risk-stat-icon">!</div>

          <div>
            <span>CRITICAL</span>
            <h2>03</h2>
            <p>Immediate attention</p>
          </div>
        </div>

        <div className="risk-stat-card">
          <div className="risk-stat-icon">▲</div>

          <div>
            <span>HIGH</span>
            <h2>05</h2>
            <p>Priority events</p>
          </div>
        </div>

        <div className="risk-stat-card risk-warning-card">
          <div className="risk-stat-icon">●</div>

          <div>
            <span>MEDIUM</span>
            <h2>04</h2>
            <p>Needs monitoring</p>
          </div>
        </div>

        <div className="risk-stat-card">
          <div className="risk-stat-icon">✓</div>

          <div>
            <span>RESOLVED TODAY</span>
            <h2>18</h2>
            <p>Events closed</p>
          </div>
        </div>

      </section>

      {/* COMMAND CENTER */}
      <section className="alerts-command-grid">

        {/* LIVE STATUS */}
        <div className="panel alert-live-panel">

          <div className="panel-header">

            <div>
              <span className="eyebrow">
                SYSTEM STATUS
              </span>

              <h2>Monitoring Status</h2>
            </div>

            <span className="live-indicator">
              <i></i>
              LIVE
            </span>

          </div>

          <div className="live-status-content">

            <div className="system-health">

              <div className="health-ring">
                <strong>94%</strong>
              </div>

              <div>
                <strong>System Health</strong>
                <p>All monitoring services operational</p>
              </div>

            </div>

            <div className="monitoring-metrics">

              <div>
                <span>AI ENGINE</span>
                <strong>Online</strong>
              </div>

              <div>
                <span>DATA STREAM</span>
                <strong>Stable</strong>
              </div>

              <div>
                <span>MONITORED MINES</span>
                <strong>24 / 24</strong>
              </div>

            </div>

          </div>

        </div>

        {/* AI PRIORITY */}
        <div className="panel alert-ai-panel">

          <span className="eyebrow">
            AI PRIORITY DETECTION
          </span>

          <div className="alert-ai-content">

            <div className="recommendation-icon">
              ✦
            </div>

            <div>
              <h2>Mine A requires attention</h2>

              <p>
                Multiple indicators have combined to create an elevated
                compliance risk. Immediate inspection is recommended.
              </p>
            </div>

          </div>

          <button className="primary-btn full-btn">
            Investigate Mine A →
          </button>

        </div>

      </section>

      {/* FILTER BAR */}
      <section className="panel alerts-filter-panel">

        <div>
          <span className="eyebrow">
            EVENT STREAM
          </span>

          <h2>Recent Alerts</h2>
        </div>

        <div className="alert-filters">

          {["All", "Critical", "High", "Medium", "Low"].map(
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

      {/* ALERT LIST */}
      <section className="panel alert-list-panel">

        <div className="alert-event-list">

          {filteredAlerts.map((alert) => (

            <div
              className="alert-event"
              key={alert.id}
            >

              <div className="alert-event-severity">

                <span
                  className={`severity-pulse ${
                    alert.severity === "Critical"
                      ? "pulse-critical"
                      : alert.severity === "High"
                      ? "pulse-high"
                      : alert.severity === "Medium"
                      ? "pulse-medium"
                      : "pulse-low"
                  }`}
                ></span>

              </div>

              <div className="alert-event-main">

                <div className="alert-event-heading">

                  <div>
                    <span className="alert-event-id">
                      {alert.id}
                    </span>

                    <h3>
                      {alert.title}
                    </h3>
                  </div>

                  <span
                    className={`alert-severity-badge ${
                      alert.severity === "Critical"
                        ? "alert-badge-critical"
                        : alert.severity === "High"
                        ? "alert-badge-high"
                        : alert.severity === "Medium"
                        ? "alert-badge-medium"
                        : "alert-badge-low"
                    }`}
                  >
                    {alert.severity}
                  </span>

                </div>

                <p className="alert-description">
                  {alert.description}
                </p>

                <div className="alert-event-meta">

                  <span>
                    Mine: <strong>{alert.mine}</strong>
                  </span>

                  <span>
                    Source: <strong>{alert.source}</strong>
                  </span>

                  <span>
                    {alert.time}
                  </span>

                </div>

              </div>

              <div className="alert-event-action">

                <span>
                  {alert.action}
                </span>

                <button>
                  View →
                </button>

              </div>

            </div>

          ))}

        </div>

      </section>

    </div>
  );
}

export default Alerts;