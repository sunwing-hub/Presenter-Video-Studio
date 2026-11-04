import { createRoot } from 'react-dom/client'
import './styles.css'
import FirstRunPreferences from './FirstRunPreferences'
import App from './App'
import TemplateLab from './TemplateLab'
import TemplateCenter from './TemplateCenter'
import StoryLab from './templates/story/StoryLab'

createRoot(document.getElementById('root')!).render(
 <><FirstRunPreferencesGate/>
  {new URLSearchParams(location.search).has('storyLab') ? <StoryLab /> : new URLSearchParams(location.search).has('templateLab') ? (['legacyLab','reviewRender','editLayer'].some(k=>new URLSearchParams(location.search).has(k)) ? <TemplateLab /> : <TemplateCenter />) : <App />}
 </>,
)

function FirstRunPreferencesGate(){const p=new URLSearchParams(location.search);return ['renderJob','reviewRender','capture'].some(k=>p.has(k))?null:<FirstRunPreferences/>}
