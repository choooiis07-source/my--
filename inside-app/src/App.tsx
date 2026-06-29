import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SetupPage from './pages/SetupPage'
import RecordingPage from './pages/RecordingPage'
import AnalyzingPage from './pages/AnalyzingPage'
import NameSettingPage from './pages/NameSettingPage'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/recording" element={<RecordingPage />} />
      <Route path="/analyzing" element={<AnalyzingPage />} />
      <Route path="/name-setting" element={<NameSettingPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  )
}

export default App