import { createUseStyles } from 'react-jss'

const screen_height = window.screen.height * 0.895;
const screen_width = window.screen.width * 0.99;
const dropdown_height = (screen_height * 0.05).toString() + 'px';
const dropdown_width = (screen_width * 0.20).toString() + 'px';

export const useStyles = createUseStyles({
  dropdown:{
    height: dropdown_height,
    width: dropdown_width,
    flexDirection: 'row',
    background: '#666666'
  },
  
  top:{
    display: 'flex',
  },
});