import { createTheme } from '@mui/material/styles'

export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f6fd6',
    },
    background: {
      default: '#f4f7fb',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
  },
})
