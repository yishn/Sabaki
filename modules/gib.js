const iconv = require('iconv-lite')
const gametree = require('./gametree')
const sgf = require('./sgf')

function handicapPoints(boardsize, handicap, tygem) {

    // Return a list of handicap points.
    // The "tygem" flag affects the positioning.

    if (boardsize < 4) {
        return []
    }

    if (handicap > 9) {
        handicap = 9
    }

    let d
    if (boardsize < 13) {
        d = 2
    } else {
        d = 3
    }

    let points = []

    if (handicap >= 2) {
        points.push([boardsize - d - 1, d])
        points.push([d, boardsize - d - 1])
    }

    // Experiments suggest Tygem puts its 3rd handicap stone in the top left

    if (handicap >= 3) {
        if (tygem) {
            points.push([d, d])
        } else {
            points.push([boardsize - d - 1, boardsize - d - 1])
        }
    }

    if (handicap >= 4) {
        if (tygem) {
            points.push([boardsize - d - 1, boardsize - d - 1])
        } else {
            points.push([d, d])
        }
    }

    if (boardsize % 2 === 0) {      // No handicap > 4 on even sided boards
        return points
    }

    let mid = (boardsize + 1) / 2

    if (handicap === 5 || handicap === 7 || handicap === 9) {
        points.push([mid - 1, mid - 1])
    }

    if (handicap >= 6) {
        points.push([d, mid - 1])
        points.push([boardsize - d - 1, mid - 1])
    }

    if (handicap >= 8) {
        points.push([mid - 1, d])
        points.push([mid - 1, boardsize - d - 1])
    }

    return points
}

exports.parse = function (input) {

    // Try UTF-8 encoding... in any case it's better than binary.

    input = iconv.decode(Buffer.from(input, 'binary'), 'utf8')

    let lines = input.split('\n')

    let tree = gametree.new()
    let root = {}
    tree.nodes.push(root)

    root.FF = ['4']
    root.GM = ['1']
    root.SZ = ['19']

    let node = root

    for (let n = 0; n < lines.length; n++) {

        let line = lines[n].trim()

        if (line.startsWith('\\[GAMEBLACKNAME=') && line.endsWith('\\]')) {

            let s = line.slice(16, -2)
            root.PB = [s]

        } else if (line.startsWith('\\[GAMEWHITENAME=') && line.endsWith('\\]')) {

            let s = line.slice(16, -2)
            root.PW = [s]

        } else if (line.startsWith('\\[GAMECONDITION=')) {

            // Hard-coded the common komi cases.
            // For better results, we could do a regex here instead.

            if (line.toLowerCase().includes('black 6.5 dum')) {
                root.KM = ['6.5']
            } else if (line.toLowerCase().includes('black 7.5 dum')) {
                root.KM = ['7.5']
            } else if (line.toLowerCase().includes('black 0.5 dum')) {
                root.KM = ['0.5']
            }

        } else if (line.startsWith('\\[GAMERESULT=')) {

            let score = null
            let strings = line.split(' ')

            // Try to find score by assuming any float found is the score.

            for (let s of strings) {
                let p = parseFloat(s)
                if (Number.isNaN(p) === false) {
                    score = p
                }
            }

            if (line.toLowerCase().includes('white') &&
                line.toLowerCase().includes('black') === false) {

                if (line.toLowerCase().includes('resignation')) {
                    root.RE = ['W+R']
                } else if (score !== null) {
                    root.RE = ['W+' + score.toString()]
                } else {
                    root.RE = ['W+']
                }
            }

            if (line.toLowerCase().includes('black') &&
                line.toLowerCase().includes('white') === false) {

                if (line.toLowerCase().includes('resignation')) {
                    root.RE = ['B+R']
                } else if (score !== null) {
                    root.RE = ['B+' + score.toString()]
                } else {
                    root.RE = ['B+']
                }
            }

        } else if (line.slice(0, 3) === 'INI') {

            let setup = line.split(' ')

            let handicap = 0
            let p = parseFloat(setup[3])
            if (Number.isNaN(p) === false) {
                handicap = p
            }

            if (handicap >= 2 && handicap <= 9) {
                root.HA = [handicap.toString()]
                root.AB = []

                let points = handicapPoints(19, handicap, true)

                for (let p of points) {
                    let [x, y] = p
                    let s = sgf.vertex2point([x, y])
                    root.AB.push(s)
                }
            }

        } else if (line.slice(0, 3) === 'STO') {

            let elements = line.split(' ')
            if (elements.length < 6) {
                continue
            }

            let node = {}
            tree.nodes.push(node)

            let key

            if (elements[3] === '1') {
                key = 'B'
            } else {
                key = 'W'
            }

            let x = parseFloat(elements[4])
            let y = parseFloat(elements[5])

            let val = sgf.vertex2point([x, y])
            node[key] = [val]
        }
    }

    return tree
}