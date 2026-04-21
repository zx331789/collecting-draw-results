

export function getIssueInfos() {
    return {
        issue: calculateIssue(), // 当前期号
        nextIssue: calculateIssue(new Date(Date.now() + 5 * 60 * 1000)), // 下一期期号
        preIssue: calculateIssue(new Date(Date.now() - 5 * 60 * 1000)), // 上一期期号
        server_date: getBeijingTime(), // 服务器时间
    }
}

export function calculateIssue(date?: Date) {
    //获取当天时间的总分钟数
    const now = date ?? new Date();
    const bjTime = getBeijingTime(now);
    const totalMinutes = bjTime.hours * 60 + bjTime.minutes;

    const issueNumber = Math.floor(totalMinutes / 5) + 1;
    const dateString = `${bjTime.year}${String(bjTime.month).padStart(2, '0')}${String(bjTime.day).padStart(2, '0')}`;

    // 计算新的当前期号
    const newCurrentIssueNumber = `${dateString}${String(issueNumber).padStart(3, '0')}`;
    return newCurrentIssueNumber;
}

export function getBeijingTime(date?: Date): { year: number; month: number; day: number; hours: number; minutes: number; seconds: number } {
    const now = date ?? new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

    return {
        year: get('year'),
        month: get('month'),
        day: get('day'),
        hours: get('hour'),
        minutes: get('minute'),
        seconds: get('second')
    };
}