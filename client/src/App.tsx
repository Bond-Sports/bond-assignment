import { Calendar } from './components/Calendar';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Facility Calendar</h1>
        <p>Today's Schedule</p>
      </header>
      <Calendar />
    </div>
  );
}

export default App;
