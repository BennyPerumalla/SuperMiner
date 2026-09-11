import { useState } from "react";

function RiskIntelligence({ setActivePage }) {
  const [selectedMine, setSelectedMine] = useState("Mine A");

  const mines = {
    "Mine A": {
      location: "Dhanbad, Jharkhand",
      risk: 82,
      compliance: 48,
      safety: "High",
      violations: 5,
      inspection: "2 days ago",
      status: "Critical",
      factors: [
        "3 overdue inspections",
        "5 unresolved violations",
        "Contractor compliance declining",
        "Ventilation observation repeated",
      ],
    },

    "Mine B": {
      location: "Asansol, West Bengal",
      risk: 24,
      compliance: 84,
      safety: "Low",
      violations: 1,
      inspection: "5 days ago",
      status: "Stable",
      factors: [
        "Compliance above 80%",
        "No critical violations",
        "Recent inspection completed",
        "Contractor performance stable",
      ],
    },

    "Mine C": {
      location: "Raniganj, West Bengal",
      risk: 57,
      compliance: 67,
      safety: "Medium",
      violations: 3,
      inspection: "7 days ago",
      status: "Attention",
      factors: [
        "2 pending corrective actions",
        "Inspection approaching deadline",
        "Environmental compliance declining",
        "3 open violations",
      ],
    },
  };

  const mine = mines[selectedMine];

  return (
    <div className="risk-page">

      {/* PAGE HEADER */}
      <div className="risk-page-header">
        <div>
          <span className="eyebrow">AI GOVERNANCE INTELLIGENCE</span>
          <h1>Risk Intelligence</h1>
          <p>
            Predictive risk monitoring across monitored coal mines.
          </p>
        </div>

        <div className="risk-header-actions">
          <button className="secondary-btn">
            Export Report
          </button>

          <button className="primary-btn">
            Run AI Analysis
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <section className="risk-stats">

        <div className="risk-stat-card">
          <div className="risk-stat-icon">◉</div>
          <div>
            <span>MONITORED MINES</span>
            <h2>24</h2>
            <p>Across all regions</p>
          </div>
        </div>

        <div className="risk-stat-card risk-danger-card">
          <div className="risk-stat-icon">!</div>
          <div>
            <span>HIGH RISK MINES</span>
            <h2>03</h2>
            <p>Immediate attention</p>
          </div>
        </div>

        <div className="risk-stat-card">
          <div className="risk-stat-icon">⌁</div>
          <div>
            <span>AVERAGE RISK</span>
            <h2>54</h2>
            <p>Across monitored mines</p>
          </div>
        </div>

        <div className="risk-stat-card risk-warning-card">
          <div className="risk-stat-icon">⚠</div>
          <div>
            <span>RISK ALERTS</span>
            <h2>12</h2>
            <p>Last 24 hours</p>
          </div>
        </div>

      </section>

      {/* MAIN RISK AREA */}
      <section className="risk-main-grid">

        {/* MAP */}
        <div className="panel risk-map-panel">

          <div className="panel-header">
            <div>
              <span className="eyebrow">GEO-SPATIAL RISK MONITORING</span>
              <h2>Mine Risk Map</h2>
            </div>

            <div className="map-legend">
              <span>
                <i className="legend-dot high-dot"></i>
                High
              </span>

              <span>
                <i className="legend-dot medium-dot"></i>
                Medium
              </span>

              <span>
                <i className="legend-dot low-dot"></i>
                Low
              </span>
            </div>
          </div>

          {/* SIMULATED GIS MAP */}
          <div className="mine-map">

            <div className="map-grid"></div>

            <div className="map-label label-jharkhand">
              JHARKHAND
            </div>

            <div className="map-label label-westbengal">
              WEST BENGAL
            </div>

            {/* MINE A */}
            <button
              className={`mine-marker marker-a ${
                selectedMine === "Mine A" ? "selected-marker" : ""
              }`}
              onClick={() => setSelectedMine("Mine A")}
              title="Mine A"
            >
              <span></span>
              <strong>Mine A</strong>
            </button>

            {/* MINE B */}
            <button
              className={`mine-marker marker-b ${
                selectedMine === "Mine B" ? "selected-marker" : ""
              }`}
              onClick={() => setSelectedMine("Mine B")}
              title="Mine B"
            >
              <span></span>
              <strong>Mine B</strong>
            </button>

            {/* MINE C */}
            <button
              className={`mine-marker marker-c ${
                selectedMine === "Mine C" ? "selected-marker" : ""
              }`}
              onClick={() => setSelectedMine("Mine C")}
              title="Mine C"
            >
              <span></span>
              <strong>Mine C</strong>
            </button>

            <div className="map-controls">
              <button>+</button>
              <button>−</button>
            </div>

          </div>
        </div>

        {/* SELECTED MINE */}
        <div className="panel selected-mine-panel">

          <div className="selected-mine-heading">
            <div>
              <span className="eyebrow">SELECTED MINE</span>
              <h2>{selectedMine}</h2>
              <p>📍 {mine.location}</p>
            </div>

            <span
              className={`mine-status ${
                mine.status === "Critical"
                  ? "status-critical"
                  : mine.status === "Attention"
                  ? "status-attention"
                  : "status-stable"
              }`}
            >
              {mine.status}
            </span>
          </div>

          {/* RISK SCORE */}
          <div className="ai-risk-score">

            <div className="risk-score-circle">
              <span>{mine.risk}</span>
              <small>/100</small>
            </div>

            <div>
              <span className="eyebrow">AI RISK SCORE</span>

              <h3>
                {mine.risk >= 70
                  ? "Critical Risk"
                  : mine.risk >= 40
                  ? "Moderate Risk"
                  : "Low Risk"}
              </h3>

              <p>
                Based on compliance, inspection and operational indicators.
              </p>
            </div>

          </div>

          {/* RISK BAR */}
          <div className="risk-progress">
            <div
              className="risk-progress-fill"
              style={{ width: `${mine.risk}%` }}
            ></div>
          </div>

          {/* MINE METRICS */}
          <div className="mine-metrics">

            <div>
              <span>COMPLIANCE</span>
              <strong>{mine.compliance}%</strong>
            </div>

            <div>
              <span>SAFETY RISK</span>
              <strong>{mine.safety}</strong>
            </div>

            <div>
              <span>VIOLATIONS</span>
              <strong>{mine.violations}</strong>
            </div>

            <div>
              <span>LAST INSPECTION</span>
              <strong>{mine.inspection}</strong>
            </div>

          </div>
              <button
                 className="primary-btn"
                onClick={() => setActivePage("GIS Map")}
                >
                 View on GIS Map →
              </button>
          

        </div>

      </section>

      {/* AI ANALYSIS */}
      <section className="risk-analysis-grid">

        {/* RISK FACTORS */}
        <div className="panel">

          <div className="panel-header">
            <div>
              <span className="eyebrow">AI ANALYSIS</span>
              <h2>Risk Factors</h2>
            </div>

            <span className="ai-badge">AI GENERATED</span>
          </div>

          <div className="risk-factor-list">

            {mine.factors.map((factor, index) => (
              <div className="risk-factor" key={index}>

                <span className="factor-number">
                  {index + 1}
                </span>

                <div>
                  <strong>{factor}</strong>
                  <p>
                    Contributing to current mine risk assessment.
                  </p>
                </div>

                <span className="factor-arrow">→</span>

              </div>
            ))}

          </div>

        </div>

        {/* AI RECOMMENDATION */}
        <div className="panel ai-recommendation">

          <span className="eyebrow">AI RECOMMENDATION</span>

          <div className="recommendation-icon">
            ✦
          </div>

          <h2>Recommended Action</h2>

          <p>
            {mine.risk >= 70
              ? `Prioritize ${selectedMine} for an immediate regulatory
                 inspection. Current indicators show elevated compliance
                 and operational risk.`
              : mine.risk >= 40
              ? `Schedule a targeted inspection for ${selectedMine}
                 and monitor pending corrective actions.`
              : `${selectedMine} is currently within a stable risk range.
                 Continue routine monitoring and scheduled inspections.`}
          </p>

          <div className="recommendation-actions">
           <button
             className="primary-btn"
             onClick={() => setActivePage("Inspections")}
           >
          Create Inspection
         </button>

            <button className="secondary-btn">
              View Evidence
            </button>
          </div>

        </div>

      </section>

      {/* RISK TREND */}
      <section className="panel risk-trend-panel">

        <div className="panel-header">

          <div>
            <span className="eyebrow">HISTORICAL ANALYSIS</span>
            <h2>Risk Trend — {selectedMine}</h2>
          </div>

          <select className="trend-select">
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>Last 6 Months</option>
          </select>

        </div>

        <div className="risk-trend">

          <div className="trend-y-axis">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>

          <div className="trend-chart">

            <div className="chart-lines">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="trend-line">
              <div style={{ height: "38%" }}></div>
              <div style={{ height: "45%" }}></div>
              <div style={{ height: "42%" }}></div>
              <div style={{ height: "56%" }}></div>
              <div style={{ height: "52%" }}></div>
              <div style={{ height: "68%" }}></div>
              <div style={{ height: `${mine.risk}%` }}></div>
            </div>

            <div className="trend-x-axis">
              <span>Aug 12</span>
              <span>Aug 17</span>
              <span>Aug 22</span>
              <span>Aug 27</span>
              <span>Sep 01</span>
              <span>Sep 06</span>
              <span>Today</span>
            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default RiskIntelligence;