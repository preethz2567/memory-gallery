import { Routes, Route, Link } from "react-router-dom";
import { Gallery } from "./pages/Gallery";
import { Upload } from "./pages/Upload";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        📷 Memory Gallery
      </Link>
      <Link to="/upload" className="navbar-link">
        + Upload Memory
      </Link>
    </nav>
  );
}

function App() {
  return (
    <div className="app-wrapper">
      <Navbar />
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </div>
  );
}

export default App;