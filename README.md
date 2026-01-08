# 📊 Trading Analytics Dashboard

A comprehensive trading analytics platform that connects to MetaTrader 5 (MT5), analyzes trading performance, and generates professional PDF reports.

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Streamlit](https://img.shields.io/badge/Streamlit-1.28%2B-red)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **MT5 Integration**: Direct connection to MetaTrader 5 for real-time data
- **Interactive Dashboard**: Myfxbook-style analytics with Plotly charts
- **Advanced Metrics**: Sharpe Ratio, Max Drawdown, Profit Factor, Z-Score, and more
- **PDF Reports**: Professional fund-style reports with embedded charts
- **Demo Mode**: Test without MT5 connection using simulated data

## 📦 Installation

### Prerequisites

- Python 3.9 or higher
- MetaTrader 5 terminal (for live data)
- Windows OS (MT5 requirement)

### Install Dependencies

```bash
cd c:\Users\p\Desktop\Trade_Tracker
pip install -r requirements.txt
```

### WeasyPrint Setup (for PDF generation)

WeasyPrint requires GTK3 on Windows:

1. Download GTK3 from: https://github.com/nicotine-plus/nicotine-plus/releases/download/3.3.4/gtk4+-3.24.41-2024.06.25.exe
2. Run the installer
3. Add GTK to your PATH (installer usually does this)
4. Restart your terminal

Alternative: If PDF generation doesn't work, the system will generate HTML reports instead.

## 🚀 Usage

### Start the Dashboard

```bash
streamlit run dashboard.py
```

The dashboard will open in your browser at `http://localhost:8501`

### Using the Dashboard

1. **With MT5 Connection**:
   - Enter your MT5 Login ID, Password, and Server
   - Select date range
   - Click "Sync MT5 Data"

2. **Demo Mode**:
   - Click "Use Demo Data" to load simulated trades
   - Great for testing without an MT5 account

3. **Generate Reports**:
   - Click "Generate PDF Report" in the sidebar
   - Download the generated report

## 📁 Project Structure

```
Trade_Tracker/
├── data_loader.py      # MT5 connection & data fetching
├── stats_engine.py     # Financial statistics calculations
├── dashboard.py        # Streamlit web interface
├── reporter.py         # PDF report generation
├── templates/          # HTML templates
├── reports/            # Generated reports output
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

## 📊 Calculated Metrics

### Growth Metrics
- **Absolute Gain %**: Total percentage return on initial capital
- **Daily/Monthly Returns**: Performance breakdown by period

### Risk Metrics
- **Max Drawdown**: Largest peak-to-trough decline
- **Profit Factor**: Gross profit / Gross loss ratio
- **Sharpe Ratio**: Risk-adjusted return (annualized)
- **Sortino Ratio**: Downside risk-adjusted return
- **Z-Score**: Win/loss streak probability analysis
- **Expectancy**: Average expected profit per trade

### Trade Analysis
- **Win Rate**: Percentage of profitable trades
- **Average Win/Loss**: Mean profit/loss per trade
- **Long vs Short**: Performance by trade direction
- **Profit by Symbol**: Breakdown by trading instrument

## 🛠️ Development

### Running Tests

```bash
python -m pytest tests/ -v
```

### Module Testing

```bash
# Test data loader
python data_loader.py

# Test statistics engine
python stats_engine.py

# Test report generator
python reporter.py
```

## ⚠️ Disclaimer

This software is for informational and educational purposes only. It does not constitute financial advice. Trading involves significant risk of loss. Past performance is not indicative of future results.

## 📄 License

MIT License - feel free to use and modify for your needs.

---

Built with ❤️ using Python, Streamlit, and Plotly
