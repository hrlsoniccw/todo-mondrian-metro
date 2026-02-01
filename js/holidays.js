/**
 * 节假日数据模块 - 中国法定假日和美国法定假日
 * 支持动态计算浮动日期（如复活节、感恩节等）
 */

const Holidays = (function() {
    'use strict';
    
    // 中国传统节日（农历）
    const traditionalHolidays = {
        // 格式: '农历月-日': 节日名称
        '1-1': '春节',
        '1-15': '元宵节',
        '2-2': '龙抬头',
        '5-5': '端午节',
        '7-7': '七夕',
        '7-15': '中元节',
        '8-15': '中秋节',
        '9-9': '重阳节',
        '12-8': '腊八节',
        '12-23': '小年',
        '12-30': '除夕'  // 通常是大年三十
    };
    
    // 中国法定假日（公历固定日期）
    const chinaFixedHolidays = {
        // 格式: '月-日': { name: 名称, type: 'holiday'|'workday', days: 放假天数 }
        '1-1': { name: '元旦', type: 'holiday', days: 1 },
        '3-8': { name: '妇女节', type: 'workday', days: 0 },  // 妇女放假半天
        '4-5': { name: '清明节', type: 'holiday', days: 1 },
        '5-1': { name: '劳动节', type: 'holiday', days: 1 },
        '5-4': { name: '青年节', type: 'workday', days: 0 },  // 青年放假半天
        '6-1': { name: '儿童节', type: 'workday', days: 0 },  // 儿童放假
        '6-1': { name: '端午节', type: 'holiday', days: 1 },
        '8-1': { name: '建军节', type: 'workday', days: 0 },  // 军人放假半天
        '9-3': { name: '抗战胜利日', type: 'workday', days: 0 },
        '9-10': { name: '教师节', type: 'workday', days: 0 },
        '10-1': { name: '国庆节', type: 'holiday', days: 3 },
        '10-2': { name: '国庆节', type: 'holiday', days: 0 },
        '10-3': { name: '国庆节', type: 'holiday', days: 0 },
    };
    
    // 美国固定日期假日
    const usFixedHolidays = {
        '1-1': { name: 'New Year\'s Day', type: 'holiday', days: 1 },
        '2-14': { name: 'Valentine\'s Day', type: 'observance', days: 0 },
        '3-17': { name: 'St. Patrick\'s Day', type: 'observance', days: 0 },
        '4-22': { name: 'Earth Day', type: 'observance', days: 0 },
        '5-5': { name: 'Cinco de Mayo', type: 'observance', days: 0 },
        '7-4': { name: 'Independence Day', type: 'holiday', days: 1 },
        '9-11': { name: 'Patriot Day', type: 'observance', days: 0 },
        '10-31': { name: 'Halloween', type: 'observance', days: 0 },
        '11-11': { name: 'Veterans Day', type: 'holiday', days: 1 },
        '12-24': { name: 'Christmas Eve', type: 'observance', days: 0 },
        '12-25': { name: 'Christmas Day', type: 'holiday', days: 1 },
        '12-31': { name: 'New Year\'s Eve', type: 'observance', days: 0 }
    };
    
    // 计算美国浮动假日
    function calculateUSFloatingHolidays(year) {
        const holidays = {};
        
        // 马丁·路德·金日：1月第3个星期一
        const mlkDay = getNthWeekdayOfMonth(year, 1, 1, 3);  // 3rd Monday of January
        holidays[`1-${mlkDay}`] = { name: 'Martin Luther King Jr. Day', type: 'holiday', days: 1 };
        
        // 总统日：2月第3个星期一
        const presidentsDay = getNthWeekdayOfMonth(year, 2, 1, 3);
        holidays[`2-${presidentsDay}`] = { name: 'Presidents\' Day', type: 'holiday', days: 1 };
        
        // 阵亡将士纪念日：5月最后一个星期一
        const memorialDay = getLastWeekdayOfMonth(year, 5, 1);
        holidays[`5-${memorialDay}`] = { name: 'Memorial Day', type: 'holiday', days: 1 };
        
        // 六月节：6月19日
        holidays['6-19'] = { name: 'Juneteenth', type: 'holiday', days: 1 };
        
        // 劳动节：9月第1个星期一
        const laborDay = getNthWeekdayOfMonth(year, 9, 1, 1);
        holidays[`9-${laborDay}`] = { name: 'Labor Day', type: 'holiday', days: 1 };
        
        // 哥伦布日/原住民日：10月第2个星期一
        const columbusDay = getNthWeekdayOfMonth(year, 10, 1, 2);
        holidays[`10-${columbusDay}`] = { name: 'Columbus Day', type: 'holiday', days: 1 };
        
        // 感恩节：11月第4个星期四
        const thanksgiving = getNthWeekdayOfMonth(year, 11, 4, 4);
        holidays[`11-${thanksgiving}`] = { name: 'Thanksgiving Day', type: 'holiday', days: 1 };
        
        // 黑色星期五：感恩节后的星期五
        const blackFriday = thanksgiving + 1;
        holidays[`11-${blackFriday}`] = { name: 'Black Friday', type: 'observance', days: 0 };
        
        // 计算复活节（使用高斯算法）
        const easter = calculateEaster(year);
        holidays[`${easter.month}-${easter.day}`] = { name: 'Easter Sunday', type: 'observance', days: 0 };
        
        // 圣周五（复活节前周五）
        const goodFriday = new Date(year, easter.month - 1, easter.day);
        goodFriday.setDate(goodFriday.getDate() - 2);
        const gfMonth = goodFriday.getMonth() + 1;
        const gfDay = goodFriday.getDate();
        holidays[`${gfMonth}-${gfDay}`] = { name: 'Good Friday', type: 'observance', days: 0 };
        
        // 母亲节：5月第2个星期日
        const mothersDay = getNthWeekdayOfMonth(year, 5, 0, 2);
        holidays[`5-${mothersDay}`] = { name: 'Mother\'s Day', type: 'observance', days: 0 };
        
        // 父亲节：6月第3个星期日
        const fathersDay = getNthWeekdayOfMonth(year, 6, 0, 3);
        holidays[`6-${fathersDay}`] = { name: 'Father\'s Day', type: 'observance', days: 0 };
        
        return holidays;
    }
    
    // 计算中国春节的公历日期（需要根据农历计算）
    // 这里使用简化数据，1900-2100年春节日期
    const springFestivalDates = {
        2024: '2-10', 2025: '1-29', 2026: '2-17', 2027: '2-6', 2028: '1-26',
        2029: '2-13', 2030: '2-3', 2031: '1-23', 2032: '2-11', 2033: '1-31',
        2034: '2-19', 2035: '2-8', 2036: '1-28', 2037: '2-15', 2038: '2-4',
        2039: '1-24', 2040: '2-12', 2041: '2-1', 2042: '1-22', 2043: '2-10',
        2044: '1-30', 2045: '2-17', 2046: '2-6', 2047: '1-26', 2048: '2-14',
        2049: '2-2', 2050: '1-23', 2051: '2-11', 2052: '2-1', 2053: '2-19',
        2054: '2-8', 2055: '1-28', 2056: '2-15', 2057: '2-4', 2058: '1-24',
        2059: '2-12', 2060: '2-2', 2061: '1-21', 2062: '2-9', 2063: '1-29',
        2064: '2-17', 2065: '2-5', 2066: '1-26', 2067: '2-14', 2068: '2-2',
        2069: '1-22', 2070: '2-11', 2071: '1-31', 2072: '2-19', 2073: '2-7',
        2074: '1-27', 2075: '2-15', 2076: '2-5', 2077: '1-24', 2078: '2-12',
        2079: '2-1', 2080: '1-21', 2081: '2-9', 2082: '1-29', 2083: '2-17',
        2084: '2-6', 2085: '1-26', 2086: '2-14', 2087: '2-3', 2088: '1-24',
        2089: '2-10', 2090: '1-30', 2091: '2-18', 2092: '2-7', 2093: '1-27',
        2094: '2-15', 2095: '2-4', 2096: '1-25', 2097: '2-12', 2098: '2-1',
        2099: '1-22', 2100: '2-10'
    };
    
    // 获取某年的中国节假日
    function getChinaHolidays(year) {
        const holidays = { ...chinaFixedHolidays };
        
        // 添加春节日期
        if (springFestivalDates[year]) {
            const [month, day] = springFestivalDates[year].split('-').map(Number);
            holidays[`${month}-${day}`] = { name: '春节', type: 'holiday', days: 3 };
            // 春节第二天和第三天
            const nextDay = new Date(year, month - 1, day + 1);
            const nextDay2 = new Date(year, month - 1, day + 2);
            holidays[`${nextDay.getMonth() + 1}-${nextDay.getDate()}`] = { name: '春节', type: 'holiday', days: 0 };
            holidays[`${nextDay2.getMonth() + 1}-${nextDay2.getDate()}`] = { name: '春节', type: 'holiday', days: 0 };
        }
        
        return holidays;
    }
    
    // 获取某年的美国节假日
    function getUSHolidays(year) {
        const holidays = { ...usFixedHolidays };
        const floatingHolidays = calculateUSFloatingHolidays(year);
        
        // 合并固定和浮动假日
        for (const [key, value] of Object.entries(floatingHolidays)) {
            if (!holidays[key]) {
                holidays[key] = value;
            }
        }
        
        return holidays;
    }
    
    // 获取某年某月某日的节假日信息
    function getHolidayInfo(year, month, day, lunarMonth = null, lunarDay = null) {
        const result = {
            china: null,
            us: null,
            traditional: null
        };
        
        const dateKey = `${month}-${day}`;
        
        // 中国传统节日（农历）
        if (lunarMonth !== null && lunarDay !== null) {
            const lunarKey = `${lunarMonth}-${lunarDay}`;
            if (traditionalHolidays[lunarKey]) {
                result.traditional = {
                    name: traditionalHolidays[lunarKey],
                    type: 'traditional'
                };
            }
        }
        
        // 中国假日
        const chinaHolidays = getChinaHolidays(year);
        if (chinaHolidays[dateKey]) {
            result.china = chinaHolidays[dateKey];
        }
        
        // 美国假日
        const usHolidays = getUSHolidays(year);
        if (usHolidays[dateKey]) {
            result.us = usHolidays[dateKey];
        }
        
        return result;
    }
    
    // 辅助函数：获取某月第N个星期几的日期
    function getNthWeekdayOfMonth(year, month, weekday, n) {
        // weekday: 0=周日, 1=周一, ..., 6=周六
        const firstDay = new Date(year, month - 1, 1);
        const firstWeekday = firstDay.getDay();
        
        let day = 1;
        if (weekday >= firstWeekday) {
            day += (weekday - firstWeekday);
        } else {
            day += (7 - firstWeekday + weekday);
        }
        
        day += (n - 1) * 7;
        return day;
    }
    
    // 辅助函数：获取某月最后一个星期几的日期
    function getLastWeekdayOfMonth(year, month, weekday) {
        const lastDay = new Date(year, month, 0);
        const lastWeekday = lastDay.getDay();
        
        let day = lastDay.getDate();
        if (lastWeekday >= weekday) {
            day -= (lastWeekday - weekday);
        } else {
            day -= (7 - weekday + lastWeekday);
        }
        
        return day;
    }
    
    // 辅助函数：计算复活节日期（高斯算法）
    function calculateEaster(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        
        return { month, day };
    }
    
    // 公共API
    return {
        getHolidayInfo,
        getChinaHolidays,
        getUSHolidays,
        traditionalHolidays,
        calculateEaster,
        springFestivalDates
    };
})();

// 兼容模块化
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Holidays;
}
