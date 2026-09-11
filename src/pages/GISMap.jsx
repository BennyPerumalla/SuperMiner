import { useState } from "react";

function GISMap() {
  const [selectedMine, setSelectedMine] = useState("Mine A");

  const mines = {
    "Mine A": {
      location: "Dhanbad, Jharkhand",
      risk: 82,
      compliance: 48,
      status: "Critical",
      violations: 5,
      inspection: "2 days ago",
      type: "Open Cast",
    },
    "Mine B": {
      location: "Asansol, West Bengal",
      risk: 24,
      compliance: 84,
      status: "Stable",
      violations: 1,
      inspection: "5 days ago",
      type: "Underground",
    },
    "Mine C": {
      location: "Raniganj, West Bengal",
      risk: 57,
      compliance: 67,
      status: "Attention",
      violations: 3,
      inspection: "7 days ago",
      type: "Open Cast",
    },
    "Mine D": {
      location: "Bokaro, Jharkhand",
      risk: 18,
      compliance: 91,
      status: "Stable",
      violations: 0,
      inspection: "3 days ago",
      type: "Underground",
    },
    "Mine E": {
      location: "Korba, Chhattisgarh",
      risk: 46,
      compliance: 72,
      status: "Attention",
      violations: 2,
      inspection: "4 days ago",
      type: "Open Cast",
    },
  };

  const mine = mines[selectedMine];

  return (
    <div className="gis-page">

      <div className="risk-page-header">
        <div>
          <span className="eyebrow">GEOSPATIAL INTELLIGENCE</span>
          <h1>GIS Mine Intelligence</h1>
          <p>
            Monitor mine locations, risk levels and compliance status
            across the mining region.
          </p>
        </div>

        <div className="risk-header-actions">
          <button className="secondary-btn">Layers</button>
          <button className="primary-btn">Export Map</button>
        </div>
      </div>

      <div className="gis-layout">

        <div className="panel gis-map-panel">

          <div className="gis-map-header">
            <div>
              <h2>Mine Risk Map</h2>
              <span>Live governance intelligence layer</span>
            </div>

            <div className="map-status">
              <span></span>
              Monitoring Active
            </div>
          </div>

          <div className="gis-map">

            <div className="map-region region-one">
              JHARKHAND
            </div>

            <div className="map-region region-two">
              WEST BENGAL
            </div>

            <div className="map-region region-three">
              CHHATTISGARH
            </div>

            <div className="map-road road-one"></div>
            <div className="map-road road-two"></div>
            <div className="map-road road-three"></div>

            <button
              className={`gis-marker marker-a ${
                selectedMine === "Mine A" ? "marker-selected" : ""
              }`}
              onClick={() => setSelectedMine("Mine A")}
            >
              <span></span>
              <strong>A</strong>
            </button>

            <button
              className={`gis-marker marker-b ${
                selectedMine === "Mine B" ? "marker-selected" : ""
              }`}
              onClick={() => setSelectedMine("Mine B")}
            >
              <span></span>
              <strong>B</strong>
            </button>

            <button
              className={`gis-marker marker-c ${
                selectedMine === "Mine C" ? "marker-selected" : ""
              }`}
              onClick={() => setSelectedMine("Mine C")}
            >
              <span></span>
              <strong>C</strong>
            </button>

            <button
              className={`gis-marker marker-d ${
                selectedMine === "Mine D" ? "marker-selected" : ""
              }`}
              onClick={() => setSelectedMine("Mine D")}
            >
              <span></span>
              <strong>D</strong>
            </button>

            <button
              className={`gis-marker marker-e ${
                selectedMine === "Mine E" ? "marker-selected" : ""
              }`}
              onClick={() => setSelectedMine("Mine E")}
            >
              <span></span>
              <strong>E</strong>
            </button>

            <div className="map-controls">
              <button>+</button>
              <button>−</button>
              <button>⌖</button>
            </div>

            <div className="map-legend">
              <strong>Risk Level</strong>

              <span>
                <i className="legend-critical"></i>
                Critical
              </span>

              <span>
                <i className="legend-high"></i>
                High
              </span>

              <span>
                <i className="legend-medium"></i>
                Medium
              </span>

              <span>
                <i className="legend-low"></i>
                Low
              </span>
            </div>

            <div className="map-label label-dhanbad">
              Dhanbad
            </div>

            <div className="map-label label-asansol">
              Asansol
            </div>

            <div className="map-label label-raniganj">
              Raniganj
            </div>

            <div className="map-label label-bokaro">
              Bokaro
            </div>

            <div className="map-label label-korba">
              Korba
            </div>

          </div>
        </div>

        <div className="gis-side">

          <div className="panel selected-mine-card">

            <div className="selected-mine-top">
              <div>
                <span className="eyebrow">SELECTED MINE</span>
                <h2>{selectedMine}</h2>
                <p>{mine.location}</p>
              </div>

              <span
                className={`gis-status ${
                  mine.status === "Critical"
                    ? "gis-critical"
                    : mine.status === "Attention"
                    ? "gis-attention"
                    : "gis-stable"
                }`}
              >
                {mine.status}
              </span>
            </div>

            <div className="gis-risk-score">
              <div>
                <span>AI RISK SCORE</span>
                <strong>{mine.risk}</strong>
                <small>/100</small>
              </div>

              <div className="gis-risk-bar">
                <div style={{ width: `${mine.risk}%` }}></div>
              </div>
            </div>

            <div className="gis-metrics">

              <div>
                <span>COMPLIANCE</span>
                <strong>{mine.compliance}%</strong>
              </div>

              <div>
                <span>VIOLATIONS</span>
                <strong>{mine.violations}</strong>
              </div>

              <div>
                <span>INSPECTION</span>
                <strong>{mine.inspection}</strong>
              </div>

              <div>
                <span>MINE TYPE</span>
                <strong>{mine.type}</strong>
              </div>

            </div>

          </div>

          <div className="panel gis-ai-panel">

            <div className="ai-badge">
              ✦ AI LOCATION INSIGHT
            </div>

            <h2>Why is {selectedMine} being monitored?</h2>

            <p>
              The AI risk engine has identified this mine as a
              {mine.risk >= 70
                ? " high-priority location requiring immediate attention."
                : mine.risk >= 40
                ? " location requiring closer monitoring."
                : " relatively stable location with low immediate risk."}
            </p>

            <div className="gis-ai-factors">

              <div>
                <span>Risk Score</span>
                <strong>{mine.risk}/100</strong>
              </div>

              <div>
                <span>Compliance</span>
                <strong>{mine.compliance}%</strong>
              </div>

              <div>
                <span>Open Violations</span>
                <strong>{mine.violations}</strong>
              </div>

            </div>

            <button className="primary-btn gis-view-btn">
              View Risk Intelligence →
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default GISMap;