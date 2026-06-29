import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#BB86FC',
    },
    secondary: {
      main: '#03DAC6',
    },
    background: {
      default: '#1C1B1F',
      paper: '#2B2930',
    },
    error: {
      main: '#CF6679',
    },
    success: {
      main: '#69F0AE',
    },
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterDelay: 300,
      },
    },
  },
})

export default theme
