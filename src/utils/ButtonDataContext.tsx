import React, { createContext, useContext, useState, useEffect } from "react";

// 定义 ButtonData 类型
interface ButtonData {
    [key: string]: [string, string];
}

  // 创建 Context
const ButtonDataContext = createContext<ButtonData | null>(null);

// 创建 Provider 组件
function ButtonDataProvider({ children }: { children: React.ReactNode }) {
    const [buttonData, setButtonData] = useState<ButtonData | null>(null);
  
    useEffect(() => {
      fetch('../cfg/style_button.json')
        .then(response => response.json())
        .then(jsonData => {
          setButtonData(jsonData);
        });
    }, []);
  
    return (
      <ButtonDataContext.Provider value={buttonData}>
        {children}
      </ButtonDataContext.Provider>
    );
  }
  
  // 创建自定义 Hook 来访问 Context
  function useButtonData() {
    return useContext(ButtonDataContext);
  }
  
  export { ButtonDataProvider, useButtonData };