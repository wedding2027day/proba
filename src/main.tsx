import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant/400.css';
import '@fontsource/cormorant/400-italic.css';
import '@fontsource/oranienbaum/400.css';
import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import './styles/base.css';
import { App } from './App';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(<App />);
