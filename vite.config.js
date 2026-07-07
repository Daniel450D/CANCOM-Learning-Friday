import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base muss exakt dem GitHub-Repo-Namen entsprechen (Gross-/Kleinschreibung!)
export default defineConfig({
  plugins: [react()],
  base: '/CANCOM-Learning-Friday/',
})
