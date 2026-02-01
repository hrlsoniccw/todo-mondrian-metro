/**
 * 农历节气转换模块 - 支持农历、24节气、干支纪年
 * 基于公历1900-2100年的农历数据
 */

const LunarCalendar = (function() {
    'use strict';
    
    // 农历数据表 (1900-2100年)
    // 每个元素代表一年的数据，16进制表示
    // 0-11位: 每月大小月 (1=大月30天, 0=小月29天)
    // 12-15位: 闰月月份 (0=无闰月)
    const lunarData = [
        0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
        0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
        0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
        0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
        0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
        0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
        0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
        0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
        0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
        0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
        0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
        0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
        0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
        0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
        0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
        0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
        0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
        0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
        0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
        0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
        0x0d520
    ];
    
    // 天干
    const heavenlyStems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    // 地支
    const earthlyBranches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    // 生肖
    const animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    // 农历月份名称
    const lunarMonths = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
    // 农历日期名称
    const lunarDays = [
        '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
        '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
        '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'
    ];
    // 二十四节气
    const solarTerms = [
        '小寒','大寒','立春','雨水','惊蛰','春分',
        '清明','谷雨','立夏','小满','芒种','夏至',
        '小暑','大暑','立秋','处暑','白露','秋分',
        '寒露','霜降','立冬','小雪','大雪','冬至'
    ];
    // 节气日期数据 (从1900年开始，每年两个节气为一组)
    const solarTermData = [
        6,20,4,19,6,21,5,20,6,21,6,22,8,23,8,23,8,24,8,24,8,25,8,25,
        5,20,4,19,6,21,5,20,6,21,6,21,7,23,8,23,8,23,8,23,8,24,8,24
    ];
    
    // 判断是否为闰年
    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }
    
    // 获取公历某月的天数
    function getSolarMonthDays(year, month) {
        const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (month === 2 && isLeapYear(year)) {
            return 29;
        }
        return days[month - 1];
    }
    
    // 获取农历某年的总天数
    function getLunarYearDays(year) {
        let sum = 348;
        const data = lunarData[year - 1900];
        for (let i = 0x8000; i > 0x8; i >>= 1) {
            sum += (data & i) ? 1 : 0;
        }
        return sum + getLeapDays(year);
    }
    
    // 获取农历某年的闰月天数
    function getLeapDays(year) {
        const data = lunarData[year - 1900];
        if (getLeapMonth(year)) {
            return (data & 0x10000) ? 30 : 29;
        }
        return 0;
    }
    
    // 获取农历某年的闰月月份 (0=无闰月)
    function getLeapMonth(year) {
        const data = lunarData[year - 1900];
        return data & 0xf;
    }
    
    // 获取农历某年某月的天数
    function getLunarMonthDays(year, month) {
        const data = lunarData[year - 1900];
        return (data & (0x10000 >> month)) ? 30 : 29;
    }
    
    // 公历转农历
    function solarToLunar(year, month, day) {
        // 参数校验
        if (year < 1900 || year > 2100) {
            throw new Error('年份超出支持范围(1900-2100)');
        }
        
        // 计算从1900年1月31日(农历1900年正月初一)到目标日期的天数
        let offset = 0;
        for (let y = 1900; y < year; y++) {
            offset += getLunarYearDays(y);
        }
        
        // 加上当年前几个月的天数
        for (let m = 1; m < month; m++) {
            offset += getSolarMonthDays(year, m);
        }
        
        // 加上当月天数
        offset += day - 1;
        
        // 减去1900年1月31日到1900年正月初一的天数偏移
        offset -= 30;
        
        // 计算农历日期
        let lunarYear = 1900;
        let lunarMonth = 1;
        let lunarDay = 1;
        let isLeap = false;
        
        // 找到对应的农历年
        while (offset >= getLunarYearDays(lunarYear)) {
            offset -= getLunarYearDays(lunarYear);
            lunarYear++;
        }
        
        // 找到对应的农历月
        const leapMonth = getLeapMonth(lunarYear);
        let isLeapMonth = false;
        
        for (let m = 1; m <= 12; m++) {
            const monthDays = getLunarMonthDays(lunarYear, m);
            if (offset < monthDays) {
                lunarMonth = m;
                lunarDay = offset + 1;
                break;
            }
            offset -= monthDays;
            
            // 检查是否有闰月
            if (leapMonth === m) {
                const leapDays = getLeapDays(lunarYear);
                if (offset < leapDays) {
                    lunarMonth = m;
                    lunarDay = offset + 1;
                    isLeap = true;
                    break;
                }
                offset -= leapDays;
            }
        }
        
        // 计算干支
        const stemIndex = (lunarYear - 4) % 10;
        const branchIndex = (lunarYear - 4) % 12;
        const gzYear = heavenlyStems[stemIndex] + earthlyBranches[branchIndex];
        
        // 计算生肖
        const animal = animals[branchIndex];
        
        // 获取节气
        const term = getSolarTerm(year, month, day);
        
        return {
            lYear: lunarYear,
            lMonth: lunarMonth,
            lDay: lunarDay,
            isLeap: isLeap,
            gzYear: gzYear,
            animal: animal,
            monthCn: (isLeap ? '闰' : '') + lunarMonths[lunarMonth - 1] + '月',
            dayCn: lunarDays[lunarDay - 1],
            term: term
        };
    }
    
    // 获取某日的节气
    function getSolarTerm(year, month, day) {
        // 使用简化的节气计算方法
        // 节气的日期基本固定，每年有微小变化
        const termInfo = [
            [6,20],   // 小寒 大寒
            [4,19],   // 立春 雨水
            [6,21],   // 惊蛰 春分
            [5,20],   // 清明 谷雨
            [6,21],   // 立夏 小满
            [6,22],   // 芒种 夏至
            [8,23],   // 小暑 大暑
            [8,23],   // 立秋 处暑
            [8,24],   // 白露 秋分
            [8,24],   // 寒露 霜降
            [8,25],   // 立冬 小雪
            [7,22]    // 大雪 冬至 (修正)
        ];
        
        // 处理节气的年份偏移
        const y = year - 1900;
        const termIndex = (month - 1) * 2;
        
        // 获取该月两个节气的日期
        let firstTermDay = termInfo[month - 1][0];
        let secondTermDay = termInfo[month - 1][1];
        
        // 根据年份调整 (简化处理，每4年调整一次)
        const offset = Math.floor((y % 4) / 2);
        firstTermDay -= offset;
        secondTermDay -= offset;
        
        if (day === firstTermDay) {
            return solarTerms[termIndex];
        } else if (day === secondTermDay) {
            return solarTerms[termIndex + 1];
        }
        
        return null;
    }
    
    // 获取某年所有节气日期
    function getYearSolarTerms(year) {
        const terms = [];
        for (let month = 1; month <= 12; month++) {
            const termInfo = [
                [6,20], [4,19], [6,21], [5,20], [6,21], [6,22],
                [8,23], [8,23], [8,24], [8,24], [8,25], [7,22]
            ];
            
            const y = year - 1900;
            const offset = Math.floor((y % 4) / 2);
            
            const firstDay = termInfo[month - 1][0] - offset;
            const secondDay = termInfo[month - 1][1] - offset;
            
            terms.push({
                name: solarTerms[(month - 1) * 2],
                month: month,
                day: firstDay
            });
            terms.push({
                name: solarTerms[(month - 1) * 2 + 1],
                month: month,
                day: secondDay
            });
        }
        return terms;
    }
    
    // 公共API
    return {
        solarToLunar,
        getSolarTerm,
        getYearSolarTerms,
        getLunarYearDays,
        getLeapMonth,
        getLunarMonthDays,
        solarTerms,
        animals,
        heavenlyStems,
        earthlyBranches,
        lunarMonths,
        lunarDays
    };
})();

// 兼容模块化
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LunarCalendar;
}
