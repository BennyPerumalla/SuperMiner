import { useState } from "react";

function Mines({ setActivePage }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const mines = [
    {
      id: "M-001",
      name: "Mine A",
      location: "Dhanbad, Jharkhand",
      type: "Open Cast",
      compliance: 48,
      risk: 82,
      status: "High Risk",
      inspection: "2 days ago",
      violations: 5,
    },
    {
      id: "M-002",
      name: "Mine B",
      location: "Asansol, West Bengal",
      type: "Underground",
      compliance: 84,
      risk: 24,
      status: "Low Risk",
      inspection: "5 days ago",
      violations: 1,
    },
    {
      id: "M-003",
      name: "Mine C",
      location: "Raniganj, West Bengal",
      type: "Open Cast",
      compliance: 67,
      risk: 57,
      status: "Medium Risk",
      inspection: "7 days ago",
      violations: 3,
    },
    {
      id: "M-004",
      name: "Mine D",
      location: "Bokaro, Jharkhand",
      type: "Underground",
      compliance: 91,
      risk: 18,
      status: "Low Risk",
      inspection: "3 days ago",
      violations: 0,
    },
    {
      id: "M-005",
      name: "Mine E",
      location: "Korba, Chhattisgarh",
      type: "Open Cast",
      compliance: 72,
      risk: 46,
      status: "Medium Risk",
      inspection: "4 days ago",
      violations: 2,
    },
  ];

  const filteredMines = mines.filter((mine) => {
    const matchesSearch =
      mine.name.toLowerCase().includes(search.toLowerCase()) ||
      mine.location.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || mine.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mines-page">

      {/* HEADER */}
      <div className="risk-page-header">
        <div>
          <span className="eyebrow">MINE MANAGEMENT</span>

          <h1>Mine Directory</h1>

          <p>
            Monitor mine-level compliance, safety and risk indicators.
          </p>
        </div>

        <button className="primary-btn">
          + Add Mine
        </button>
      </div>

      {/* SUMMARY */}
      <section className="risk-stats">

        <div className="risk-stat-card">
          <div className="risk-stat-icon">◉</div>

          <div>
            <span>TOTAL MINES</span>
            <h2>24</h2>
            <p>Currently monitored</p>
          </div>
        </div>

        <div className="risk-stat-card risk-danger-card">
          <div className="risk-stat-icon">!</div>

          <div>
            <span>HIGH RISK</span>
            <h2>03</h2>
            <p>Immediate attention</p>
          </div>
        </div>

        <div className="risk-stat-card risk-warning-card">
          <div className="risk-stat-icon">⚠</div>

          <div>
            <span>MEDIUM RISK</span>
            <h2>07</h2>
            <p>Needs monitoring</p>
          </div>
        </div>

        <div className="risk-stat-card">
          <div className="risk-stat-icon">✓</div>

          <div>
            <span>COMPLIANT</span>
            <h2>14</h2>
            <p>Low-risk mines</p>
          </div>
        </div>

      </section>

      {/* FILTER BAR */}
      <section className="panel mines-filter-panel">

        <div className="mine-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search mine or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mine-filters">

          <button
            className={filter === "All" ? "filter-active" : ""}
            onClick={() => setFilter("All")}
          >
            All
          </button>

          <button
            className={filter === "High Risk" ? "filter-active" : ""}
            onClick={() => setFilter("High Risk")}
          >
            High Risk
          </button>

          <button
            className={filter === "Medium Risk" ? "filter-active" : ""}
            onClick={() => setFilter("Medium Risk")}
          >
            Medium
          </button>

          <button
            className={filter === "Low Risk" ? "filter-active" : ""}
            onClick={() => setFilter("Low Risk")}
          >
            Low Risk
          </button>

        </div>

      </section>

      {/* MINE TABLE */}
      <section className="panel mine-directory-panel">

        <div className="panel-header">

          <div>
            <span className="eyebrow">MONITORED ASSETS</span>

            <h2>
              Mine Status
            </h2>
          </div>

          <span className="mine-count">
            {filteredMines.length} mines shown
          </span>

        </div>

        <div className="mine-table-wrapper">

          <table className="mine-directory-table">

            <thead>

              <tr>
                <th>Mine</th>
                <th>Location</th>
                <th>Type</th>
                <th>Compliance</th>
                <th>AI Risk</th>
                <th>Violations</th>
                <th>Last Inspection</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              {filteredMines.map((mine) => (

                <tr key={mine.id} 
                onClick={() => setActivePage("Risk Intelligence")}
                style={{ cursor: "pointer" }}
                >

                  <td>
                    <div className="mine-name">
                      <strong>{mine.name}</strong>
                      <span>{mine.id}</span>
                    </div>
                  </td>

                  <td>
                    <span className="location-text">
                      📍 {mine.location}
                    </span>
                  </td>

                  <td>
                    {mine.type}
                  </td>

                  <td>
                    <div className="compliance-cell">

                      <strong>
                        {mine.compliance}%
                      </strong>

                      <div className="mini-progress">
                        <div
                          style={{
                            width: `${mine.compliance}%`,
                          }}
                        ></div>
                      </div>

                    </div>
                  </td>

                  <td>
                    <strong
                      className={
                        mine.risk >= 70
                          ? "high-text"
                          : mine.risk >= 40
                          ? "medium-text"
                          : "low-text"
                      }
                    >
                      {mine.risk}
                    </strong>
                  </td>

                  <td>
                    {mine.violations}
                  </td>

                  <td>
                    {mine.inspection}
                  </td>

                  <td>

                    <span
                      className={`status ${
                        mine.status === "High Risk"
                          ? "high-status"
                          : mine.status === "Medium Risk"
                          ? "medium-status"
                          : "low-status"
                      }`}
                    >
                      {mine.status}
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

export default Mines;