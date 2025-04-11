import logo from '../assets/heptagon.png';
import '../App.css';

function LandingPage() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p style={{ fontSize: '30px' }}>
          <code>Geo-Compute</code>
        </p>
        <p style={{ fontSize: '20px' }}>
          A web application for computational geometry algorithm implementation
        </p>
        <a
          className="App-link"
          href="/canvas"
        >
          Get started...
        </a>
      </header>
    </div>
  );
}

export default LandingPage;
