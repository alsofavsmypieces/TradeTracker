"""
PDF Report Generator
====================
Generates professional trading performance PDF reports.
Uses Matplotlib for static charts, Jinja2 for HTML templating,
and WeasyPrint for HTML → PDF conversion.
"""

import os
import io
import base64
import logging
from datetime import datetime
from typing import Dict, Any, Optional

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server use
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Wedge
from jinja2 import Environment, FileSystemLoader, select_autoescape

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    logging.warning("WeasyPrint not available. PDF generation will not work.")

from stats_engine import TradingStats

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Generates professional PDF trading reports.
    
    Features:
    - Growth line chart (balance over time)
    - Donut chart (profit vs loss breakdown)
    - Drawdown area chart
    - Monthly performance table
    - Key statistics summary
    
    Usage:
        generator = ReportGenerator(trades_df, stats, account_info, initial_balance)
        generator.generate_pdf("report.pdf")
    """
    
    # Chart styling
    COLORS = {
        'profit': '#22c55e',   # Green
        'loss': '#ef4444',     # Red
        'primary': '#7c3aed',  # Purple
        'secondary': '#00d4aa', # Teal
        'background': '#0f172a',
        'card': '#1e293b',
        'text': '#f8fafc',
        'muted': '#94a3b8'
    }
    
    def __init__(
        self,
        trades_df: pd.DataFrame,
        stats: TradingStats,
        account_info: Optional[Dict[str, Any]],
        initial_balance: float
    ):
        """
        Initialize report generator.
        
        Args:
            trades_df: DataFrame with trade data
            stats: TradingStats instance with calculated metrics
            account_info: MT5 account information dictionary
            initial_balance: Starting account balance
        """
        self.trades = trades_df
        self.stats = stats
        self.account_info = account_info or {}
        self.initial_balance = initial_balance
        self.summary = stats.get_summary()
        
        # Get template directory
        self.template_dir = os.path.join(os.path.dirname(__file__), 'templates')
        os.makedirs(self.template_dir, exist_ok=True)
        
        # Set matplotlib style
        plt.style.use('dark_background')
        plt.rcParams['font.family'] = 'sans-serif'
        plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'sans-serif']
        plt.rcParams['axes.facecolor'] = self.COLORS['card']
        plt.rcParams['figure.facecolor'] = self.COLORS['background']
        plt.rcParams['text.color'] = self.COLORS['text']
        plt.rcParams['axes.labelcolor'] = self.COLORS['text']
        plt.rcParams['xtick.color'] = self.COLORS['muted']
        plt.rcParams['ytick.color'] = self.COLORS['muted']
    
    def _fig_to_base64(self, fig: plt.Figure) -> str:
        """Convert matplotlib figure to base64 encoded PNG string."""
        buffer = io.BytesIO()
        fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight',
                   facecolor=self.COLORS['background'], edgecolor='none')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        return f"data:image/png;base64,{img_base64}"
    
    def generate_growth_chart(self) -> str:
        """
        Generate balance growth line chart.
        
        Returns:
            Base64 encoded PNG image
        """
        if self.trades.empty:
            return self._generate_placeholder_chart("No Data Available")
        
        # Prepare data
        df = self.trades.copy()
        df['cumulative_profit'] = df['net_profit'].cumsum()
        df['balance'] = self.initial_balance + df['cumulative_profit']
        
        # Create figure
        fig, ax = plt.subplots(figsize=(12, 5))
        
        # Plot balance line with gradient fill
        ax.fill_between(df['time'], self.initial_balance, df['balance'],
                       alpha=0.3, color=self.COLORS['secondary'])
        ax.plot(df['time'], df['balance'], color=self.COLORS['secondary'],
               linewidth=2.5, label='Balance')
        
        # Mark winning/losing trades
        wins = df[df['net_profit'] > 0]
        losses = df[df['net_profit'] < 0]
        
        ax.scatter(wins['time'], wins['balance'], c=self.COLORS['profit'],
                  s=30, zorder=5, alpha=0.7)
        ax.scatter(losses['time'], losses['balance'], c=self.COLORS['loss'],
                  s=30, zorder=5, alpha=0.7)
        
        # Formatting
        ax.set_xlabel('Date', fontsize=10)
        ax.set_ylabel('Balance ($)', fontsize=10)
        ax.set_title('Account Growth', fontsize=14, fontweight='bold', pad=15)
        
        # Format x-axis dates
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax.xaxis.set_major_locator(mdates.AutoDateLocator())
        fig.autofmt_xdate()
        
        # Format y-axis as currency
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))
        
        # Grid
        ax.grid(True, alpha=0.2, linestyle='--')
        ax.set_axisbelow(True)
        
        # Remove spines
        for spine in ax.spines.values():
            spine.set_visible(False)
        
        fig.tight_layout()
        return self._fig_to_base64(fig)
    
    def generate_donut_chart(self) -> str:
        """
        Generate profit vs loss donut (ring) chart.
        
        Returns:
            Base64 encoded PNG image
        """
        gross_profit = abs(self.summary['gross_profit'])
        gross_loss = abs(self.summary['gross_loss'])
        
        if gross_profit == 0 and gross_loss == 0:
            return self._generate_placeholder_chart("No Trades")
        
        # Create figure
        fig, ax = plt.subplots(figsize=(6, 6))
        
        # Data for pie
        sizes = [gross_profit, gross_loss]
        colors = [self.COLORS['profit'], self.COLORS['loss']]
        labels = ['Profit', 'Loss']
        
        # Create donut chart
        wedges, texts, autotexts = ax.pie(
            sizes,
            colors=colors,
            labels=labels,
            autopct='%1.1f%%',
            startangle=90,
            pctdistance=0.75,
            wedgeprops=dict(width=0.5, edgecolor=self.COLORS['background']),
            textprops=dict(color=self.COLORS['text'], fontsize=11)
        )
        
        # Style percentage text
        for autotext in autotexts:
            autotext.set_fontweight('bold')
        
        # Add center text
        center_text = f"${self.summary['total_profit']:+,.0f}"
        center_color = self.COLORS['profit'] if self.summary['total_profit'] >= 0 else self.COLORS['loss']
        ax.text(0, 0, center_text, ha='center', va='center',
               fontsize=18, fontweight='bold', color=center_color)
        ax.text(0, -0.15, 'Net P/L', ha='center', va='center',
               fontsize=10, color=self.COLORS['muted'])
        
        ax.set_title('Profit vs Loss', fontsize=14, fontweight='bold', pad=15)
        
        fig.tight_layout()
        return self._fig_to_base64(fig)
    
    def generate_drawdown_chart(self) -> str:
        """
        Generate drawdown area chart.
        
        Returns:
            Base64 encoded PNG image
        """
        dd_df = self.stats.get_drawdown_series()
        
        if dd_df.empty:
            return self._generate_placeholder_chart("No Drawdown Data")
        
        # Create figure
        fig, ax = plt.subplots(figsize=(12, 3))
        
        # Plot drawdown as negative values (decline from peak)
        ax.fill_between(dd_df['time'], 0, -dd_df['drawdown_pct'],
                       color=self.COLORS['loss'], alpha=0.5)
        ax.plot(dd_df['time'], -dd_df['drawdown_pct'],
               color=self.COLORS['loss'], linewidth=1.5)
        
        # Mark max drawdown point
        max_dd_idx = dd_df['drawdown_pct'].idxmax()
        max_dd = dd_df.loc[max_dd_idx, 'drawdown_pct']
        max_dd_time = dd_df.loc[max_dd_idx, 'time']
        
        ax.scatter([max_dd_time], [-max_dd], color='white', s=50, zorder=5)
        ax.annotate(f'Max: {max_dd:.1f}%',
                   xy=(max_dd_time, -max_dd),
                   xytext=(10, -20),
                   textcoords='offset points',
                   fontsize=9,
                   color=self.COLORS['text'],
                   arrowprops=dict(arrowstyle='->', color=self.COLORS['muted']))
        
        # Formatting
        ax.set_xlabel('Date', fontsize=10)
        ax.set_ylabel('Drawdown (%)', fontsize=10)
        ax.set_title('Drawdown Over Time', fontsize=14, fontweight='bold', pad=15)
        
        # Format x-axis
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax.xaxis.set_major_locator(mdates.AutoDateLocator())
        fig.autofmt_xdate()
        
        # Grid
        ax.grid(True, alpha=0.2, linestyle='--')
        ax.set_axisbelow(True)
        
        # Remove spines
        for spine in ax.spines.values():
            spine.set_visible(False)
        
        # Keep y-axis at 0 as top
        ax.set_ylim(top=0)
        
        fig.tight_layout()
        return self._fig_to_base64(fig)
    
    def _generate_placeholder_chart(self, text: str) -> str:
        """Generate a placeholder chart with message."""
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.text(0.5, 0.5, text, ha='center', va='center',
               fontsize=16, color=self.COLORS['muted'])
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        fig.tight_layout()
        return self._fig_to_base64(fig)
    
    def _get_template_html(self) -> str:
        """Get the HTML template string."""
        return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Performance Report</title>
    <style>
        @page {
            size: A4;
            margin: 1.5cm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            line-height: 1.6;
        }
        
        .container {
            max-width: 100%;
            padding: 20px;
        }
        
        /* Header */
        .header {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #334155;
        }
        
        .header-left h1 {
            font-size: 28px;
            background: linear-gradient(90deg, #00d4aa, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 5px;
        }
        
        .header-left p {
            color: #94a3b8;
            font-size: 12px;
        }
        
        .header-right {
            text-align: right;
        }
        
        .header-right .account-id {
            font-size: 18px;
            font-weight: 600;
        }
        
        .header-right .broker {
            color: #94a3b8;
            font-size: 12px;
        }
        
        /* KPI Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .kpi-card {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        
        .kpi-label {
            font-size: 11px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .kpi-value {
            font-size: 22px;
            font-weight: 700;
        }
        
        .kpi-value.positive { color: #22c55e; }
        .kpi-value.negative { color: #ef4444; }
        .kpi-value.neutral { color: #00d4aa; }
        
        /* Section */
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #7c3aed;
        }
        
        /* Two Column Layout */
        .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        /* Chart Container */
        .chart-container {
            background: #1e293b;
            border-radius: 12px;
            padding: 15px;
            border: 1px solid #334155;
        }
        
        .chart-container img {
            width: 100%;
            height: auto;
            display: block;
        }
        
        /* Stats Table */
        .stats-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .stats-table th,
        .stats-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #334155;
        }
        
        .stats-table th {
            background: #1e293b;
            font-size: 11px;
            text-transform: uppercase;
            color: #94a3b8;
            letter-spacing: 0.5px;
        }
        
        .stats-table td {
            font-size: 14px;
        }
        
        .stats-table tr:hover {
            background: rgba(124, 58, 237, 0.1);
        }
        
        /* Monthly Returns */
        .monthly-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .monthly-table th,
        .monthly-table td {
            padding: 8px;
            text-align: center;
            border: 1px solid #334155;
        }
        
        .monthly-table th {
            background: #1e293b;
            font-weight: 600;
        }
        
        .monthly-table td.positive {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }
        
        .monthly-table td.negative {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        
        /* Footer */
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #334155;
            text-align: center;
            color: #64748b;
            font-size: 10px;
        }
        
        .disclaimer {
            margin-top: 10px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <h1>📊 Trading Performance Report</h1>
                <p>Period: {{ period_start }} to {{ period_end }}</p>
                <p>Generated: {{ generated_date }}</p>
            </div>
            <div class="header-right">
                <div class="account-id">Account #{{ account_id }}</div>
                <div class="broker">{{ broker }}</div>
                <div class="broker">Server: {{ server }}</div>
            </div>
        </div>
        
        <!-- KPI Cards -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Final Balance</div>
                <div class="kpi-value neutral">${{ "{:,.2f}".format(final_balance) }}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Total Profit</div>
                <div class="kpi-value {{ 'positive' if total_profit >= 0 else 'negative' }}">
                    ${{ "{:+,.2f}".format(total_profit) }}
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Absolute Gain</div>
                <div class="kpi-value {{ 'positive' if gain_pct >= 0 else 'negative' }}">
                    {{ "{:+.2f}".format(gain_pct) }}%
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Max Drawdown</div>
                <div class="kpi-value negative">{{ "{:.2f}".format(max_drawdown) }}%</div>
            </div>
        </div>
        
        <!-- Summary Section -->
        <div class="section">
            <h2 class="section-title">Performance Summary</h2>
            <div class="two-col">
                <div class="chart-container">
                    <img src="{{ donut_chart }}" alt="Profit vs Loss">
                </div>
                <div>
                    <table class="stats-table">
                        <tr>
                            <td>Profit Factor</td>
                            <td><strong>{{ profit_factor_display }}</strong></td>
                        </tr>
                        <tr>
                            <td>Sharpe Ratio</td>
                            <td><strong>{{ "{:.2f}".format(sharpe_ratio) }}</strong></td>
                        </tr>
                        <tr>
                            <td>Win Rate</td>
                            <td><strong>{{ "{:.1f}".format(win_rate) }}%</strong></td>
                        </tr>
                        <tr>
                            <td>Total Trades</td>
                            <td><strong>{{ total_trades }}</strong></td>
                        </tr>
                        <tr>
                            <td>Expectancy</td>
                            <td><strong>${{ "{:.2f}".format(expectancy) }}</strong></td>
                        </tr>
                        <tr>
                            <td>Z-Score</td>
                            <td><strong>{{ "{:.2f}".format(z_score) }}</strong></td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Growth Chart -->
        <div class="section">
            <h2 class="section-title">Account Growth</h2>
            <div class="chart-container">
                <img src="{{ growth_chart }}" alt="Account Growth">
            </div>
        </div>
        
        <!-- Drawdown Chart -->
        <div class="section">
            <h2 class="section-title">Drawdown Analysis</h2>
            <div class="chart-container">
                <img src="{{ drawdown_chart }}" alt="Drawdown">
            </div>
        </div>
        
        <!-- Trade Statistics -->
        <div class="section">
            <h2 class="section-title">Trade Statistics</h2>
            <div class="two-col">
                <table class="stats-table">
                    <tr>
                        <td>Winning Trades</td>
                        <td style="color: #22c55e;"><strong>{{ winning_trades }}</strong></td>
                    </tr>
                    <tr>
                        <td>Losing Trades</td>
                        <td style="color: #ef4444;"><strong>{{ losing_trades }}</strong></td>
                    </tr>
                    <tr>
                        <td>Average Win</td>
                        <td style="color: #22c55e;"><strong>${{ "{:.2f}".format(avg_win) }}</strong></td>
                    </tr>
                    <tr>
                        <td>Average Loss</td>
                        <td style="color: #ef4444;"><strong>${{ "{:.2f}".format(avg_loss) }}</strong></td>
                    </tr>
                </table>
                <table class="stats-table">
                    <tr>
                        <td>Largest Win</td>
                        <td style="color: #22c55e;"><strong>${{ "{:.2f}".format(largest_win) }}</strong></td>
                    </tr>
                    <tr>
                        <td>Largest Loss</td>
                        <td style="color: #ef4444;"><strong>${{ "{:.2f}".format(largest_loss) }}</strong></td>
                    </tr>
                    <tr>
                        <td>Long Win Rate</td>
                        <td><strong>{{ "{:.1f}".format(long_win_rate) }}%</strong></td>
                    </tr>
                    <tr>
                        <td>Short Win Rate</td>
                        <td><strong>{{ "{:.1f}".format(short_win_rate) }}%</strong></td>
                    </tr>
                </table>
            </div>
        </div>
        
        <!-- Monthly Returns -->
        {% if monthly_returns %}
        <div class="section">
            <h2 class="section-title">Monthly Returns</h2>
            <table class="monthly-table">
                <thead>
                    <tr>
                        <th>Year</th>
                        {% for month in months %}
                        <th>{{ month }}</th>
                        {% endfor %}
                    </tr>
                </thead>
                <tbody>
                    {% for year, values in monthly_returns.items() %}
                    <tr>
                        <td><strong>{{ year }}</strong></td>
                        {% for month in months %}
                        {% set val = values.get(month, None) %}
                        <td class="{{ 'positive' if val and val > 0 else 'negative' if val and val < 0 else '' }}">
                            {{ "{:.1f}%".format(val) if val is not none else "-" }}
                        </td>
                        {% endfor %}
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}
        
        <!-- Footer -->
        <div class="footer">
            <p>Trading Analytics Dashboard | Report generated automatically</p>
            <p class="disclaimer">
                ⚠️ This report is for informational purposes only and does not constitute financial advice.
                Past performance is not indicative of future results.
            </p>
        </div>
    </div>
</body>
</html>'''
    
    def render_html(self) -> str:
        """
        Render the HTML report with all data and charts.
        
        Returns:
            Rendered HTML string
        """
        # Generate charts
        growth_chart = self.generate_growth_chart()
        donut_chart = self.generate_donut_chart()
        drawdown_chart = self.generate_drawdown_chart()
        
        # Prepare monthly returns data
        monthly_df = self.stats.get_monthly_returns()
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        monthly_returns = {}
        if not monthly_df.empty:
            for year in monthly_df.index:
                monthly_returns[int(year)] = {
                    month: monthly_df.loc[year, month] if month in monthly_df.columns and pd.notna(monthly_df.loc[year, month]) else None
                    for month in months
                }
        
        # Determine date range
        if not self.trades.empty:
            period_start = self.trades['time'].min().strftime('%Y-%m-%d')
            period_end = self.trades['time'].max().strftime('%Y-%m-%d')
        else:
            period_start = period_end = 'N/A'
        
        # Template variables
        template_vars = {
            # Header
            'period_start': period_start,
            'period_end': period_end,
            'generated_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'account_id': self.account_info.get('login', 'N/A'),
            'broker': self.account_info.get('company', 'Unknown Broker'),
            'server': self.account_info.get('server', 'N/A'),
            
            # KPIs
            'final_balance': self.summary['final_balance'],
            'total_profit': self.summary['total_profit'],
            'gain_pct': self.summary['absolute_gain_pct'],
            'max_drawdown': self.summary['max_drawdown_pct'],
            
            # Charts
            'growth_chart': growth_chart,
            'donut_chart': donut_chart,
            'drawdown_chart': drawdown_chart,
            
            # Stats
            'profit_factor': self.summary['profit_factor'] if self.summary['profit_factor'] != float('inf') else 999.99,
            'profit_factor_display': "{:.2f}".format(self.summary['profit_factor']) if self.summary['profit_factor'] != float('inf') else "∞",
            'sharpe_ratio': self.summary['sharpe_ratio'],
            'win_rate': self.summary['win_rate_pct'],
            'total_trades': self.summary['total_trades'],
            'expectancy': self.summary['expectancy'],
            'z_score': self.summary['z_score'],
            
            # Trade details
            'winning_trades': self.summary['winning_trades'],
            'losing_trades': self.summary['losing_trades'],
            'avg_win': self.summary['avg_win'],
            'avg_loss': abs(self.summary['avg_loss']),
            'largest_win': self.summary['largest_win'],
            'largest_loss': abs(self.summary['largest_loss']),
            'long_win_rate': self.summary['long_win_rate'],
            'short_win_rate': self.summary['short_win_rate'],
            
            # Monthly returns
            'monthly_returns': monthly_returns,
            'months': months
        }
        
        # Render template
        from jinja2 import Template
        template = Template(self._get_template_html())
        return template.render(**template_vars)
    
    def generate_pdf(self, output_path: str) -> str:
        """
        Generate PDF report and save to file.
        
        Args:
            output_path: Path to save the PDF file
            
        Returns:
            Path to the generated PDF
            
        Raises:
            ImportError: If WeasyPrint is not available
            Exception: If PDF generation fails
        """
        if not WEASYPRINT_AVAILABLE:
            raise ImportError(
                "WeasyPrint is required for PDF generation. "
                "Install it with: pip install weasyprint\n"
                "On Windows, you may also need to install GTK3. "
                "See: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows"
            )
        
        try:
            # Render HTML
            html_content = self.render_html()
            
            # Convert to PDF
            html = HTML(string=html_content)
            html.write_pdf(output_path)
            
            logger.info(f"PDF report generated: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to generate PDF: {str(e)}")
            raise
    
    def generate_html_file(self, output_path: str) -> str:
        """
        Generate HTML report (alternative if PDF generation unavailable).
        
        Args:
            output_path: Path to save the HTML file
            
        Returns:
            Path to the generated HTML file
        """
        html_content = self.render_html()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"HTML report generated: {output_path}")
        return output_path


if __name__ == "__main__":
    # Demo usage
    from data_loader import create_demo_data
    
    print("Generating demo report...")
    
    # Create demo data
    trades_df = create_demo_data()
    stats = TradingStats(trades_df, initial_balance=10000)
    
    account_info = {
        'login': 12345678,
        'company': 'Demo Broker Ltd',
        'server': 'Demo-Server',
        'currency': 'USD'
    }
    
    # Create generator
    generator = ReportGenerator(trades_df, stats, account_info, 10000)
    
    # Create reports directory
    reports_dir = os.path.join(os.path.dirname(__file__), 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    # Generate HTML (always works)
    html_path = os.path.join(reports_dir, 'demo_report.html')
    generator.generate_html_file(html_path)
    print(f"✅ HTML report saved: {html_path}")
    
    # Try to generate PDF
    if WEASYPRINT_AVAILABLE:
        try:
            pdf_path = os.path.join(reports_dir, 'demo_report.pdf')
            generator.generate_pdf(pdf_path)
            print(f"✅ PDF report saved: {pdf_path}")
        except Exception as e:
            print(f"❌ PDF generation failed: {e}")
    else:
        print("⚠️ WeasyPrint not available. Install it for PDF generation.")
        print("   pip install weasyprint")
