import './index.css'
import Data from './Data.tsx'
// import Data from './Data_read_local_excel.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'effect-dropdown-react/dist/index.css'
import { ButtonDataProvider } from './utils/ButtonDataContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>    
    <ButtonDataProvider>
      <Data />
    </ButtonDataProvider>
  </StrictMode>,
);
