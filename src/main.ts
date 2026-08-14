import {GameManager} from './GameManager.js';

declare const DEBUG: boolean;
DEBUG && new EventSource('/esbuild').addEventListener('change', () => location.reload());

const canvas = document.getElementById('c') as HTMLCanvasElement;
const game = new GameManager(canvas);
