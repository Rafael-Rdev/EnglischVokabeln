import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Flashcards from './pages/Flashcards'
import Quiz from './pages/Quiz'
import FillBlank from './pages/FillBlank'
import Vocabulary from './pages/Vocabulary'
import AIGenerator from './pages/AIGenerator'
import Progress from './pages/Progress'
import Settings from './pages/Settings'

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/fillblank" element={<FillBlank />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/ai-generator" element={<AIGenerator />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App