import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyRoomLight, initialTheme } from './utils/roomLight';

applyRoomLight(initialTheme());

createRoot(document.getElementById('root')!).render(<App />);
