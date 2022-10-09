export const money = money => {
	const postfix = 'k m b t q Q s S o n'.split(' ')
	const powers = '3 6 9 12 15 18 21 24 27 30'.split(' ').map(x => parseInt(x)) // higher shows in exponent format
	const sign = money >= 0 ? '' : '-'
	money = Math.abs(money)

	for (let i = 0; i < postfix.length; i++) {
		const pow = Math.pow(10, powers[i]);
		if (money < (1000 * pow)) {
			let fm = Math.trunc(money / pow * 1000)/ 1000;
			return `$${sign}${fm}${postfix[i]}`;
		}
	}

	for (let i = 30; i < 303; i += 3) {
		const pow = Math.pow(10, i);
		if (money < (1000 * pow)) {
			let fm = Math.trunc(money / pow * 1000)/ 1000
			return `$${sign}${fm}e+${i}`
		}
	}
}

export const short = short => {
	const sign = short >= 0 ? '' : '-'
	short = Math.abs(short)
    if (short < 1000000) return `${sign}${Math.trunc(short*100)/100}`
	const exp = Math.trunc(Math.log10(short) / 3) * 3
	const num = Math.trunc(short * 1000 / Math.pow(10, exp)) / 1000
	return `${sign}${num}e${exp}`
}


export const ram = ram => {
	const postfix = 'KB MB GB TB PB EB ZB YB'.split(' ')
	const powers = [10, 20, 30, 40, 50, 60, 70, 80]
	const sign = ram >= 0 ? '' : '-'
	ram = Math.abs(ram)

	for (let i = 0; i < postfix.length; i++) {
		const pow = Math.pow(2, powers[i])
		if (ram < pow * 1024 || i === (postfix.length - 1)) {
			let div = ram / pow
			div = Math.trunc(div * 10) / 10
			return `${sign}${div}${postfix[i]}`
		}
	}
	return `${Math.trunc(ram)}`
}

export const gb = gb => ram(gb * Math.pow(2, 30))

// https://talyian.github.io/ansicolors/
export const colors = {
	reset: '\x1b[0m',
	basicBlack: '\x1b[30m',
	basicRed: '\x1b[31m',
	basicGreen: '\x1b[32m',
	basicYellow: '\x1b[33m',
	basicBlue: '\x1b[34m',
	basicMagenta: '\x1b[35m',
	basicCyan: '\x1b[36m',
	basicWhite: '\x1b[37m',
	bgBasicBlack: '\x1b[40m',
	bgBasicRed: '\x1b[41m',
	bgBasicGreen: '\x1b[42m',
	bgBasicYellow: '\x1b[43m',
	bgBasicBlue: '\x1b[44m',
	bgBasicMagenta: '\x1b[45m',
	bgBasicCyan: '\x1b[46m',
	bgBasicWhite: '\x1b[47m',
	srgb: (r,g,b) => `\x1b[38;5;${16 + 36 * Math.min(5, Math.max(r, 0)) + 6 * Math.min(5, Math.max(r, 0)) + Math.min(5, Math.max(r, 0))}m`, // simple color 0-5
	gray: v => `\x1b[38;5;${232 + Math.max(0, Math.min(23, v))}m`, // from 0-23
	bgGray: v => `\x1b[48;5;${232 + Math.max(0, Math.min(23, v))}m`, // from 0-23, 23 being white
	bgsrgb: (r,g,b) => `\x1b[48;5;${16 + 36 * Math.min(5, Math.max(r, 0)) + 6 * Math.min(5, Math.max(r, 0)) + Math.min(5, Math.max(r, 0))}m`, // simple background 0-5
	bgfrom: (...values) => colors.from(...values).replace('38', '48'),
	from: (...values) => {
		// look for hex specifier
		if (values.length === 1 && typeof(values[0]) === 'string' && values[0][0] === '#') {
			let hex = values[0]
			if (hex.length === 4) {
				hex = `#${hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3]}`
			}
			/** @param {string} str */
			const fromHex = (str, pos) => {
				let value = parseInt(str.substring(pos, pos + 2), 16)
				value = Math.min(255, Math.max(0, value))
				// divide 256 by 6...  about 43 per
				value = Math.ceil(value * 6 / 256)
			}
			let r = fromHex(hex, 1), g = fromHex(hex, 2), b = fromHex(hex, 3)
			return `\x1b[38;5;${16 + 36 * Math.min(5, Math.max(r, 0)) + 6 * Math.min(5, Math.max(r, 0)) + Math.min(5, Math.max(r, 0))}m`
		}
	}
}

const createThemeFunc = color => {
	return (str) => str ? color + str + theme.reset() : color
}

export const theme = {
	colors: {
		// reset: colors.gray(20) + '\x1b[40m',
		//reset: colors.basicRed + '\x1b[40m',
		reset: '\x1b[40m', // setting background to black is enough to reset apparently
		hostname: '\x1b[36m',
		error: '\x1b[38;5;1m',
		success: '\x1b[38;5;2m',
		warn: '\x1b[38;5;3m',
		info: '\x1b[38;5;4m',
		command: '\x1b[38;5;5m',
	}
}

Object.keys(theme.colors).forEach(key => theme[key] = str => str ? theme.colors[key] + str + theme.colors.reset : theme.colors[key])

export default {
  money,
  ram,
  short,
  gb
}