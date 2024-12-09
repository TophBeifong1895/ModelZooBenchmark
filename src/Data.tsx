import './Data.css';
import * as XLSX from 'xlsx';
import { useButtonData } from './utils/ButtonDataContext';
import React, { useState, useRef, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ChartData{
  style: string;
  color: string;
  data : {
    model        : string,
    input_shape  : string,
    bit          : string,
    ocmopt       : string,
    quantization : string,
    dataset      : string,
    time         : number,
    metrics      : { [ key : string ] : number },
  } [ ];
};

export interface ExcelReaderProps{
  onDataLoaded : ( data : ChartData ) => void;
};

const ExcelReader : React.FC<ExcelReaderProps> = ( { onDataLoaded } ) => {   // FC for functional component 函数组件

  const [workbook,        setWorkbook]        = useState<XLSX.WorkBook | null>(null);
  const [datasets,        setDatasets]        = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [isButtonClicked, setIsButtonClicked] = useState<boolean>(false);

  useEffect(() => {    //   读取仓库中的 Excel 文件 定义一个状态来存储workbook数据
    fetch('./Icraft_Icore_Metrics_V3.6.2_subtotal.xlsx')
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        setWorkbook(workbook);
      })
      .catch(error => console.error('Error reading Excel file:', error));
  }, []);

  const buttonData = useButtonData();
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const [chart_data, setChartData] = useState<ChartData>({
    style: '',
    color: '',
    data: []
  });
  const [fullChartData, setFullChartData] = useState<ChartData>({
    style: '',
    color: '',
    data: []
  });

  useEffect(() => {
    if (workbook) {
      const buttonsContainer = buttonsContainerRef.current;
      if (buttonsContainer) {
        buttonsContainer.innerHTML = '';
        for (let i = 0; i < workbook.SheetNames.length; i++) {
          
          const newChartData: ChartData = {   //  每次点击按钮都清空数据
            style : '',
            color : '',
            data  : []
          };

          const sheetName = workbook.SheetNames[i];
          const worksheet = workbook.Sheets[sheetName];

          const button = document.createElement('button');          // 创建按钮
          button.textContent = sheetName;
          
          let displayName;    // 按钮显示名称
          if (buttonData && buttonData[sheetName] && buttonData[sheetName][0]) {
            displayName = buttonData[sheetName][0];
          } else {
            displayName = sheetName;
          };

          button.textContent = displayName;
          button.addEventListener('click', () => {          // 添加按钮点击事件
            console.log(`Sheet Name: ${sheetName}`);
            const headerRow = 1;

            if (!worksheet['!ref']) {            // 检查 sheet['!ref'] 是否为 undefined
              console.error('工作表范围未定义');
              return;
            };

            const headerRange = XLSX.utils.decode_range(worksheet['!ref']); 
            const headerRowRange = {
              s: { c: headerRange.s.c, r: headerRow - 1 },      // s for start, c for column, r for row, e for end
              e: { c: headerRange.e.c, r: headerRow - 1 }     
            };
      
            // 获取表头行的单元格数据
            const headerCells = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: headerRowRange });
            const headers: string[] = (headerCells[0] as string[]) || [];       // 第一行
            const targetHeaders = ['Model', 'Input_shape', 'Bit_prec', "Ocmopt", 'hard_time (ms)', "Quantization", "Dataset"];
            const targetColumnIndices = targetHeaders.map(headerName => {     //  找targetHeaders是第几列
              const index = headers.indexOf(headerName);
              if (index === -1) {
                console.log(`表头 "${headerName}" 不存在`);
                return null;
              };
              return index;
            }).filter(index => index !== null);
      
            for (let rowIndex = headerRow; rowIndex <= headerRange.e.r; rowIndex++) {   // 提取targetHeaders指定列的数据
              const rowData = {} as { [key: string]: unknown };
              for (const columnIndex of targetColumnIndices) {
                const cellAddress = XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex });
                const cell = worksheet[cellAddress];
                if (cell && cell.v !== undefined) {
                  rowData[headers[columnIndex]] = cell.v;
                };
              };
  
              const datasetColumnIndex = headers.indexOf('Dataset');    // Dataset后面的列全是精度
              if (datasetColumnIndex === -1) {
                console.error('找不到 "Dataset" 列');
                continue;
              };
                 
              const datasetColumnData = [];           // 提取 "Dataset" 列的数据
              for (let rowIndex = headerRow; rowIndex <= headerRange.e.r; rowIndex++) {
                const cellAddress = XLSX.utils.encode_cell({ c: datasetColumnIndex, r: rowIndex });
                const cell = worksheet[cellAddress];
                if (cell && cell.v !== undefined) {
                  datasetColumnData.push(cell.v);
                }
              }
              
              const uniqueDatasets = [...new Set(datasetColumnData)];
              setDatasets(uniqueDatasets);

              if (uniqueDatasets.length > 1){
                console.log('生成多个数据集按钮 重置数据')
                console.log('rowData : '+ JSON.stringify(rowData))
                
                if (rowData['Dataset'] === selectedDataset){
         
                    console.log("selectedDataset : "+ selectedDataset)
                  }
               }

              // 获取从 "Dataset" 列开始的所有列的数据和表头名称
              const startIndex = datasetColumnIndex + 1;
              const endIndex = headerRange.e.c;       // 最后一列的索引
              const metricsColumnIndices = Array.from({ length: endIndex - startIndex + 1 }, (_, index) => startIndex + index);
              
              // 提取从 "Dataset" 列开始的所有列的数据  ----->  精度数据
              const metrics_data: { [ key: string ]: number } = {};
              for (const columnIndex of metricsColumnIndices) {
                const cellAddress = XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex });
                const cell = worksheet[cellAddress];
                if (cell && cell.v !== undefined) {
                  metrics_data[headers[columnIndex]] = cell.v
                };
              };

              const each_model_data = {  
                model        : rowData['Model'] as string,
                input_shape  : rowData['Input_shape'] as string,
                time         : rowData['hard_time (ms)'] as number,
                bit          : rowData['Bit_prec'] as string,
                ocmopt       : rowData['Ocmopt'] as string,
                quantization : rowData['Quantization'] as string,
                dataset      : rowData['Dataset'] as string,
                metrics      : metrics_data
              }

              console.log('each_model_data', each_model_data);

              if (newChartData) {
                newChartData.style = sheetName;
                newChartData.data.push(each_model_data);
              }
              
              const buttonStyle = newChartData?.style || '';
              if (buttonData) {
                const dotColor = buttonData[buttonStyle]?.[1]|| 'defaultColor';
                newChartData.color = dotColor;
              }
            };

            setFullChartData(newChartData);     
            setChartData(newChartData);        // 状态更新函数 使用新的extracted_data值
            onDataLoaded(newChartData);   // 调用父组件的回调函数 将数据传递给父组件
            setIsButtonClicked(true);
          });

          // 将按钮添加到容器中
          buttonsContainer.appendChild(button); // appendChild将子节点添加到指定父节点  buttonsContainer是一个html元素
        };
      }
      else {
        console.error('无法找到按钮容器元素，ID: buttons-container');
      }
    }
  }, [workbook, onDataLoaded, buttonData, selectedDataset]);
  const handleDatasetSelect = (datasets: React.SetStateAction<string | null>) => {
    setSelectedDataset(datasets);
    const filteredData = fullChartData.data.filter(row => row.dataset === datasets);
    setChartData({
      ...fullChartData,
      data: filteredData
    });
    onDataLoaded({
      ...fullChartData,
      data:filteredData
    });
  }

  // 确保 chart_data 被正确使用
  useEffect(() => {
    console.log('chart_data updated:', chart_data);
  }, [chart_data]);

  return (
    <div>
      <div id="buttons-container" ref={buttonsContainerRef}>
      </div>

      {isButtonClicked && (
        <div>
          <h3>Current Dataset</h3>
          {datasets.map(dataset => (
            <button
              key={dataset}
              onClick={() => handleDatasetSelect(dataset)}
              style={{ marginRight: '10px' }}
            >
            {dataset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function Data() {
  
  type ReactNode = React.ReactNode;

  const [chartData, setChartData] = useState<ChartData>();
  const [showChart, setShowChart] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [selectedPoint,  setSelectedPoint]  = useState<ChartData['data'][0] | null>(null);
  
  const [timeMin, setTimeMin] = useState<number | 'auto'>('auto');
  const [timeMax, setTimeMax] = useState<number | 'auto'>('auto');
  const [metricMin, setMetricMin] =  useState<number | 'auto'>('auto');
  const [metricMax, setMetricMax] =  useState<number | 'auto'>('auto');
  const handleExcelData = (excel_data: ChartData) => {
    setChartData(excel_data);
    console.log('excel_data : ', excel_data);
    setShowChart(true);   // 数据加载完成后显示图表
    
    // 初始化selectedMetric 还没点按钮选指标时 显示第一个精度指标的数据
    if (excel_data.data && excel_data.data.length > 0 &&  Array.isArray(excel_data.data)) {          // 确保数据不为空
      const firstRow = excel_data.data[0];
      if (firstRow && firstRow.metrics) {
        const firstMetricKey = Object.keys(excel_data.data[0].metrics)[0];
        setSelectedMetric(firstMetricKey);
        setTimeMin(0);
        setTimeMax('auto');
        setMetricMin(0);
        setMetricMax('auto');
      } else {
        console.warn('No valid metrics found in the first row of the Excel file.');
      }
    } else {
      console.warn('No valid data found in the Excel file.');
    }
  };

  const handleMetricButtonClick = (metricKey: string) => {  // 处理按钮点击事件
    setSelectedMetric(metricKey);
  };
  
  const handlePointClick = (point: ChartData['data'][0]) => {
    setSelectedPoint(point);
  }
 
  const handleCloseSidebar = () => {
    setSelectedPoint(null);
  };

  const handleTimeDomainChange = (event: React.ChangeEvent<HTMLInputElement>, isMin: boolean) => {
    const value = parseFloat(event.target.value);
    if (isMin) {
      setTimeMin(value);
    } else {
      setTimeMax(value);
    }
  };

  const handleMetricDomainChange = (event: React.ChangeEvent<HTMLInputElement>, isMin: boolean) => {
    const value = parseFloat(event.target.value);
    if (isMin) {
      setMetricMin(value);
    } else {
      setMetricMax(value);
    }
  };

  useEffect(() => {}, [selectedMetric, chartData]);    // 依赖数组指定哪些状态或属性变化时触发 useEffect
  const metricsKeys = chartData?.data && chartData.data.length > 0 ? Object.keys(chartData.data[0].metrics) : [];
  const showColor = chartData?.color
  
  return (
    
    <>
      <h1>ModelZoo Benchmark</h1>

      {showChart && (
        <div className="chart">
          <h3>Time Metrics Chart</h3>
          <div>
            {metricsKeys.map(metricKey => (       //  map遍历metricsKeys数组 生成多个精度指标按钮
                <button key={metricKey} onClick={ () => handleMetricButtonClick(metricKey) }>
                  {metricKey}
                </button>
                )
              )
            }
          </div>

          <div>
            <div style={{ height: '20px' }}>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row' }}>    
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

                <label>
                  Time Min:
                  <input
                    type="number"
                    value={timeMin}
                    onChange={(event) => handleTimeDomainChange(event, true)}
                  />
                </label>

                <div style={{ height: '20px' }}></div>

                <label>
                  Time Max:
                  <input
                    type="number"
                    value={timeMax}
                    onChange={(event) => handleTimeDomainChange(event, false)}
                  />
                </label>

              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <label>
                  Metrics Min:
                  <input
                    type="number"
                    value={metricMin}
                    onChange={(event) => handleMetricDomainChange(event, true)}
                  />
                </label>
                
                <div style={{ height: '20px' }}></div>

                <label>
                  Metrics Max:
                  <input
                    type="number"
                    value={metricMax}
                    onChange={(event) => handleMetricDomainChange(event, false)}
                  />
          
                </label>
              </div>
            </div>
          
            <div style={{ height: '20px' }}></div>
          </div>

          <div style={{ width: '100%', height: '600px' }}>
            <ScatterChart width={1200} height={600} data={chartData?.data}>
              <XAxis
                dataKey={(entry) => entry.time}
                name="time"
                unit="ms"
                type="number"
                domain={[timeMin, timeMax]}
                allowDataOverflow
                label={{
                  value   : 'Icore Time',
                  position: 'insideRight',
                  offset  : 60,
                  style   : { fontSize: '20px' }
                }}
              />
              <YAxis    // chartData是一个数组，entry代表的是chartData中的每一个对象
                dataKey={ (entry) => entry.metrics [selectedMetric || metricsKeys[0] ] }
                name="metrics"
                type="number"
                allowDataOverflow
                domain={[metricMin, metricMax]}
                label={{
                  value   : 'Metrics',
                  angle   : -90,
                  position: 'insideLeft',
                  offset  : 5,
                  style   : { fontSize: '20px' }
                }}
              />

              <CartesianGrid strokeDasharray="3 3" />   {/*网格线*/}  
              <Tooltip 
                cursor={ { strokeDasharray: '3 3' } }
                content={
                  ( { payload } ) => {
                    if ( payload && payload.length > 0 ) {
                      const infoData = payload[0].payload;
                      return (                              //  悬停显示
                        <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc' }}>
                          <p style={{ color: 'black' }}>  {infoData['model']} {infoData['bit']}bit</p>
                          <p style={{ color: 'black' }}>  Time:    {infoData['time']} ms</p>
                          <p style={{ color: 'black' }}>  Metrics: {infoData['metrics'][selectedMetric]}</p>
                        </div>
                      );
                    };
                    return null;
                  }
                }
              />

              <Legend
                align="left"
                verticalAlign="top"
                wrapperStyle={ { marginTop: -10, marginLeft: -5 } } 
              />   

              <Scatter
                name={selectedMetric}
                dataKey={(entry) => entry['metrics'][selectedMetric || metricsKeys[0]]}
                fill={showColor}
                radius={0.5}
                onClick={(data) => handlePointClick(data)}
              />

            </ScatterChart>
          </div> 


          {selectedPoint && (   
            <div style={{position: 'fixed',
                         top: 0,
                         right: 0,
                         width: '300px',
                         height: '100%',
                         backgroundColor: '#bfbfbf',
                         padding: '20px',
                         color: 'black',
                         }}>

              <button
                onClick={handleCloseSidebar}
                style={{position: 'absolute',
                        top: '10px',
                        right: '10px',
                        padding: '4px 8px',
                        fontSize: '20px',
                        backgroundColor: '#555555',
                        }}>
                ×
              </button>
              <h3> {selectedPoint.model} {selectedPoint.bit}bit</h3>
              <p style={{ textAlign: 'left' }}> Input shape: {selectedPoint.input_shape}</p>
              <p style={{ textAlign: 'left' }}> Time: {selectedPoint.time} ms</p>
              <p style={{ textAlign: 'left' }}> Metrics:</p>
              <ul style={{textAlign: 'left'}}>
                {Object.entries(selectedPoint.metrics).map(([key, value]) => (
                  <li key={key}>{key}: {value as ReactNode}</li>
                ))}
              </ul>
              <p style={{ textAlign: 'left' }}> Best Ocm: {selectedPoint.ocmopt}</p>
              <p style={{ textAlign: 'left' }}> Best Quantization: {selectedPoint.quantization}</p>
              <p style={{ textAlign: 'left' }}> Dataset: {selectedPoint.dataset}</p>
            </div>
          )}

        </div>
      )}

      <div className="Data">
        <ExcelReader onDataLoaded={handleExcelData} />
      </div>

    </>
  )
}

export default Data