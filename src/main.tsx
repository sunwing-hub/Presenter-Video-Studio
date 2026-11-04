import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import TemplateLab from './TemplateLab'
import TemplateCenter from './TemplateCenter'
import StoryLab from './templates/story/StoryLab'

createRoot(document.getElementById('root')!).render(
  // This local page is the user's live video editor, not a development demo.
  // StrictMode's development-only double render duplicates every video tick
  // and causes visible preview stalls on large subtitle/material timelines.
  new URLSearchParams(location.search).has('storyLab') ? <StoryLab /> : new URLSearchParams(location.search).has('templateLab') ? (['legacyLab','reviewRender','editLayer'].some(k=>new URLSearchParams(location.search).has(k)) ? <TemplateLab /> : <TemplateCenter />) : <App />,
)
