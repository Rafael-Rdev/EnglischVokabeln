import { NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">VocabBoost</span>
      <ul className="navbar-links">
        <li>
          <NavLink to="/" end>Start</NavLink>
        </li>
        <li>
          <NavLink to="/flashcards">Karteikarten</NavLink>
        </li>
        <li>
          <NavLink to="/quiz">Quiz</NavLink>
        </li>
        <li>
          <NavLink to="/fillblank">Lückentext</NavLink>
        </li>
        <li>
          <NavLink to="/vocabulary">Vokabeln</NavLink>
        </li>
        <li>
          <NavLink to="/ai-generator">KI-Generator</NavLink>
        </li>
        <li>
          <NavLink to="/progress">Fortschritt</NavLink>
        </li>
        <li>
          <NavLink to="/settings">Einstellungen</NavLink>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar