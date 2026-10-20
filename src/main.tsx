import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  // This local page is the user's live video editor, not a development demo.
  // StrictMode's development-only double render duplicates every video tick
  // and causes visible preview stalls on large subtitle/material timelines.
  <App />,
)
