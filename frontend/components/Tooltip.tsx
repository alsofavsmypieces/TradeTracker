'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    isDark?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ text, children, isDark = true, position = 'top' }: TooltipProps) {
    const [show, setShow] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-y-transparent border-l-transparent',
    };

    return (
        <span
            className="relative inline-flex items-center"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}

            {show && (
                <span className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}>
                    <span className={`block px-3 py-2 rounded-lg text-xs max-w-xs whitespace-normal text-center shadow-lg ${isDark
                        ? 'bg-slate-700 text-slate-100 border border-slate-600'
                        : 'bg-gray-800 text-white'
                        }`}>
                        {text}
                    </span>
                    <span className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
                </span>
            )}
        </span>
    );
}

// Pre-defined metric explanations
export const METRIC_EXPLANATIONS: { [key: string]: string } = {
    // Risk Metrics
    'Profit Factor': 'อัตราส่วนระหว่างกำไรรวมและขาดทุนรวม ถ้า > 1 = กำไร, ถ้า > 2 = ดีมาก',
    'Standard Deviation': 'ค่าเบี่ยงเบนมาตรฐานของกำไร/ขาดทุน ยิ่งต่ำยิ่งสม่ำเสมอ',
    'Sharpe Ratio': 'วัดผลตอบแทนเทียบกับความเสี่ยง ยิ่งสูงยิ่งดี (> 1 = ดี, > 2 = ดีมาก)',
    'Z-Score (Probability)': 'วัดความสัมพันธ์ระหว่าง trades ติดกัน และโอกาสที่จะเกิดขึ้น',
    'Z-Score': 'วัดความสัมพันธ์ระหว่าง trades ติดกัน ค่า + = Win ต่อเนื่อง, ค่า - = สลับกัน',
    'Expectancy': 'กำไรเฉลี่ยต่อ trade หนึ่งครั้ง (pips และ $)',
    'AHPR': 'Average Holding Period Return - ผลตอบแทนเฉลี่ยต่อ trade หนึ่งครั้ง (%)',
    'GHPR': 'Geometric Holding Period Return - อัตราการเติบโตต่อ trade (ยิ่งใกล้ 1 ยิ่งดี)',

    // Performance
    'Longs Won': 'จำนวนและเปอร์เซ็นต์ของ trade ซื้อ (Buy) ที่ชนะ',
    'Shorts Won': 'จำนวนและเปอร์เซ็นต์ของ trade ขาย (Sell) ที่ชนะ',
    'Best Trade ($)': 'กำไรสูงสุดจาก trade เดียว',
    'Worst Trade ($)': 'ขาดทุนมากสุดจาก trade เดียว',
    'Best Trade (Pips)': 'Pips สูงสุดจาก trade เดียว',
    'Worst Trade (Pips)': 'Pips ต่ำสุดจาก trade เดียว',
    'Avg. Trade Length': 'ระยะเวลาเฉลี่ยในการถือ trade',

    // Trading Activity
    'Trades': 'จำนวน trades ทั้งหมดในช่วงเวลาที่เลือก',
    'Profitability': 'เปอร์เซ็นต์กำไรเทียบกับเงินทุน',
    'Pips': 'จำนวน pips รวมทั้งหมด',
    'Average Win': 'กำไรเฉลี่ยต่อ trade ที่ชนะ (pips / $)',
    'Average Loss': 'ขาดทุนเฉลี่ยต่อ trade ที่แพ้ (pips / $)',
    'Lots': 'ปริมาณ lot รวมที่เทรดทั้งหมด',

    // Calculator
    'Break-Even Win Rate': 'อัตรา Win Rate ขั้นต่ำที่ต้องมีเพื่อไม่ขาดทุน',
    'Risk:Reward': 'อัตราส่วนความเสี่ยงต่อผลตอบแทน (1:2 = รับความเสี่ยง 1 เพื่อกำไร 2)',
    'Risk Amount': 'จำนวนเงินที่ยอมเสียได้ต่อ trade',
    'Lot Size': 'ขนาด lot ที่แนะนำตามความเสี่ยง',

    // Periods
    'GAIN': 'เปอร์เซ็นต์การเปลี่ยนแปลงของเงินทุน',
    'PROFIT': 'กำไร/ขาดทุนรวมในช่วงเวลา',
    'PIPS': 'จำนวน pips รวมในช่วงเวลา',
    'WIN%': 'เปอร์เซ็นต์ trades ที่ชนะ',

    // Risk of Ruin
    'Risk of Ruin': 'ความน่าจะเป็นที่จะขาดทุนถึงระดับที่กำหนด',
    'Loss Size': 'เปอร์เซ็นต์ของเงินทุนที่สูญเสีย',
    'Probability of Loss': 'โอกาสที่จะขาดทุนถึงระดับนี้',
    'Consecutive Losing Trades': 'จำนวน trades แพ้ติดต่อกันที่ต้องเกิดขึ้น',

    // Symbol Breakdown
    'Currency': 'คู่เงินหรือสินทรัพย์ที่เทรด',
    'Longs': 'จำนวน trades ที่เปิด Buy (เดิมพันว่าราคาจะขึ้น)',
    'Shorts': 'จำนวน trades ที่เปิด Sell (เดิมพันว่าราคาจะลง)',
    'Won(%)': 'เปอร์เซ็นต์ trades ที่ชนะ',
    'Lost(%)': 'เปอร์เซ็นต์ trades ที่แพ้',

    // Charts
    'Winners vs Losers by Hour': 'แสดงจำนวน trades ที่ชนะ/แพ้ แยกตามชั่วโมงของวัน',
    'Winners vs Losers by Day': 'แสดงจำนวน trades ที่ชนะ/แพ้ แยกตามวันในสัปดาห์',
    'Duration (Growth)': 'ความสัมพันธ์ระหว่างระยะเวลาถือ trade กับเปอร์เซ็นต์กำไร',
    'MAE vs Trade Outcome': 'Maximum Adverse Excursion - การขาดทุนสูงสุดระหว่างถือ trade',

    // Goal Tracker
    'daily Goal': 'เป้าหมายกำไรรายวัน',
    'weekly Goal': 'เป้าหมายกำไรรายสัปดาห์',
    'monthly Goal': 'เป้าหมายกำไรรายเดือน',

    // Open Positions
    'Floating P&L': 'กำไร/ขาดทุนที่ยังไม่ได้ปิด (ยังเปิดอยู่)',
    'Entry': 'ราคาที่เปิด trade',
    'Current': 'ราคาปัจจุบัน',

    // Account
    'Account Balance': 'เงินในบัญชีหลังจากปิด trades ทั้งหมด',
    'Equity': 'มูลค่าบัญชีรวม Floating P&L',

    // Risk Model (% per trade)
    'Average Return': 'ผลตอบแทนเฉลี่ยต่อ trade หนึ่งครั้ง (%)',
    'Std Deviation': 'ค่าเบี่ยงเบนมาตรฐานของผลตอบแทน - ยิ่งต่ำยิ่งสม่ำเสมอ',
    'Avg Win': 'กำไรเฉลี่ยต่อ trade ที่ชนะ (%)',
    'Avg Loss': 'ขาดทุนเฉลี่ยต่อ trade ที่แพ้ (%)',
    'Best Trade': 'กำไรสูงสุดจาก trade เดียว (%)',
    'Worst Trade': 'ขาดทุนมากสุดจาก trade เดียว (%)',
    'Win Rate': 'เปอร์เซ็นต์ trades ที่ชนะ',
    'Payoff Ratio': 'อัตราส่วน Avg Win / Avg Loss',
    'Break-Even WR': 'Win Rate ขั้นต่ำที่ต้องมีเพื่อไม่ขาดทุน',
    'Edge': 'ความได้เปรียบ = Win Rate - Break-Even WR (ยิ่งสูงยิ่งดี)',
    'Kelly Full': 'ขนาด position ที่เหมาะสมตาม Kelly Criterion (ต้นฉบับ)',
    'Kelly Half (แนะนำ)': 'Kelly ÷ 2 - ลดความเสี่ยงลง แนะนำสำหรับการเทรดจริง',
    'Conservative (1/4 Kelly)': 'Kelly ÷ 4 - สำหรับผู้ที่ต้องการความปลอดภัยสูง',
};

// Helper component for inline metric with tooltip
interface MetricWithTooltipProps {
    label: string;
    children?: React.ReactNode;
    isDark?: boolean;
}

export function MetricLabel({ label, isDark = true }: MetricWithTooltipProps) {
    const explanation = METRIC_EXPLANATIONS[label];

    if (!explanation) {
        return <span>{label}</span>;
    }

    return (
        <Tooltip text={explanation} isDark={isDark}>
            <span className="flex items-center gap-1 cursor-help border-b border-dashed border-slate-500">
                {label}
            </span>
        </Tooltip>
    );
}
