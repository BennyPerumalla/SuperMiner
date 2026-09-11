import { useState } from "react";
import "./App.css";
import RiskIntelligence from "./pages/RiskIntelligence";
import Mines from "./pages/Mines";
import Compliance from "./pages/Compliance";
import Inspections from "./pages/Inspections";
import GISMap from "./pages/GISMap";
import Alerts from "./pages/Alerts";


function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const renderPage = () => {
    if (activePage === "Risk Intelligence") {
        return <RiskIntelligence setActivePage={setActivePage} />;
     }

    if (activePage === "Mines") {
      return <Mines />;
    }

    if (activePage === "Compliance") {
      return <Compliance />;
    }

    if (activePage === "Inspections") {
      return <Inspections setActivePage={setActivePage} />;
    }

    if (activePage === "GIS Map") {
      return <GISMap />;
    }

    if (activePage === "Alerts") {
      return <Alerts />;
    }

    return (
      <>
        {/* TOP HEADER */}
        <header className="topbar">
          <div>
            <h1>Mine Governance Overview</h1>
            <p>
              Monitor compliance, safety and operational risks.
            </p>
          </div>

          <div className="profile">
            <div className="notification">🔔</div>

            <div className="avatar">O</div>

            <div>
              <strong>Officer</strong>
              <span>Regulatory Authority</span>
            </div>
          </div>
        </header>

        {/* STATISTICS */}
        <section className="stats">

          <div className="stat-card">
            <span>ACTIVE MINES</span>
            <h2>24</h2>
            <p>↑ 8% from last month</p>
          </div>

          <div className="stat-card danger">
            <span>HIGH RISK MINES</span>
            <h2>03</h2>
            <p>Requires immediate attention</p>
          </div>

          <div className="stat-card warning">
            <span>PENDING COMPLIANCE</span>
            <h2>18</h2>
            <p>Actions awaiting closure</p>
          </div>

          <div className="stat-card">
            <span>OPEN VIOLATIONS</span>
            <h2>12</h2>
            <p>Across monitored mines</p>
          </div>

        </section>

        {/* DASHBOARD MAIN GRID */}
        <section className="dashboard-grid">

          {/* AI RISK PANEL */}
          <div className="panel risk-panel">

            <span className="eyebrow">
              AI COMPLIANCE INTELLIGENCE
            </span>

            <h2>High Risk Detected</h2>

            <div className="risk-score">

              <div className="score">
                82
              </div>

              <div>
                <strong>Mine A</strong>
                <p>AI Risk Score</p>
              </div>

            </div>

            <div className="risk-bar">
              <div></div>
            </div>

            <ul className="risk-reasons">
              <li>3 overdue inspections</li>
              <li>5 unresolved violations</li>
              <li>Contractor compliance declining</li>
            </ul>

            <button
                    className="primary-btn"
               onClick={() => setActivePage("Risk Intelligence")}
            >
             View Mine Details →
            </button>

          </div>

          {/* RECENT ALERTS */}
          <div className="panel">

            <div className="panel-header">

              <div>
                <span className="eyebrow">
                  RECENT ALERTS
                </span>

                <h2>Attention Required</h2>
              </div>

              <span className="view-all">
                View all
              </span>

            </div>

            <div className="alert">

              <span className="alert-dot critical"></span>

              <div>
                <strong>
                  Critical Safety Violation
                </strong>

                <p>
                  Mine A • 15 min ago
                </p>
              </div>

            </div>

            <div className="alert">

              <span className="alert-dot high"></span>

              <div>
                <strong>
                  Inspection Overdue
                </strong>

                <p>
                  Mine C • 1 hour ago
                </p>
              </div>

            </div>

            <div className="alert">

              <span className="alert-dot medium"></span>

              <div>
                <strong>
                  Compliance Action Pending
                </strong>

                <p>
                  Mine B • 3 hours ago
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* MINE TABLE */}
        <section className="panel mine-panel">

          <div className="panel-header">

            <div>
              <span className="eyebrow">
                MINE MONITORING
              </span>

              <h2>
                Mine Compliance Status
              </h2>
            </div>

            <button
              className="secondary-btn"
              onClick={() =>
                setActivePage("Risk Intelligence")
              }
            >
              View All Mines →
            </button>

          </div>

          <table>

            <thead>

              <tr>
                <th>Mine</th>
                <th>Compliance</th>
                <th>AI Risk</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              <tr>

                <td>
                  <strong>Mine A</strong>
                </td>

                <td>
                  48%
                </td>

                <td>
                  <span className="risk-text high-text">
                    82
                  </span>
                </td>

                <td>
                  <span className="status high-status">
                    High Risk
                  </span>
                </td>

              </tr>

              <tr>

                <td>
                  <strong>Mine B</strong>
                </td>

                <td>
                  84%
                </td>

                <td>
                  <span className="risk-text low-text">
                    24
                  </span>
                </td>

                <td>
                  <span className="status low-status">
                    Low Risk
                  </span>
                </td>

              </tr>

              <tr>

                <td>
                  <strong>Mine C</strong>
                </td>

                <td>
                  67%
                </td>

                <td>
                  <span className="risk-text medium-text">
                    57
                  </span>
                </td>

                <td>
                  <span className="status medium-status">
                    Medium Risk
                  </span>
                </td>

              </tr>

            </tbody>

          </table>

        </section>
      </>
    );
  };

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="logo">

          <div className="logo-icon">
            M
          </div>

          <div>
            <h2>MineSentinel</h2>
            <span>AI Governance</span>
          </div>

        </div>

        <nav>

          <a
            className={
              activePage === "Dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Dashboard")
            }
          >
            ▦ Dashboard
          </a>

          <a
            className={
              activePage === "Mines"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Mines")
            }
          >
            ⛏ Mines
          </a>

          <a
            className={
              activePage === "Compliance"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Compliance")
            }
          >
            ✓ Compliance
          </a>

          <a
            className={
              activePage === "Inspections"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Inspections")
            }
          >
            ▣ Inspections
          </a>

          <a
            className={
              activePage === "Alerts"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Alerts")
            }
          >
            ⚠ Alerts
          </a>

          <a
            className={
              activePage === "Risk Intelligence"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Risk Intelligence")
            }
          >
            ◈ Risk Intelligence
          </a>

          <a
            className={
              activePage === "GIS Map"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("GIS Map")
            }
          >
            ◉ GIS Map
          </a>

        </nav>

        <div className="sidebar-bottom">

          <a>⚙ Settings</a>

          <a>↪ Logout</a>

        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="main">

        {renderPage()}

      </main>

    </div>
  );
}

export default App;