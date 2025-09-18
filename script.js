document.addEventListener('DOMContentLoaded', () => {
    const noteInput = document.getElementById('noteInput');
    const renderButton = document.getElementById('renderButton');
    const staffContainer = document.getElementById('staffContainer');
    const downloadSvgButton = document.getElementById('downloadSvgButton');
    const downloadPngButton = document.getElementById('downloadPngButton');

    const LINE_GAP = 10;
    const STAFF_GAP = 70;
    const STAFF_TOP_Y = 50;
    const NOTE_HEAD_RX = 5.5;
    const NOTE_HEAD_RY = 4.5;
    const MEASURE_WIDTH = 250;

    const durationValues = { w: 4, h: 2, q: 1, e: 0.5, i: 0.5 };
    
    const notePitchesTreble = { 'C': 10, 'D': 5, 'E': 0, 'F': -5, 'G': -10, 'A': -15, 'B': -20 };
    const notePitchesBass = { 'E': 10, 'F': 5, 'G': 0, 'A': -5, 'B': -10, 'C': -15, 'D': -20 };
    const OCTAVE_HEIGHT = 35;

    const svgStyles = `
        .staff-line { stroke: black; stroke-width: 1; }
        .measure-line { stroke: black; stroke-width: 1.5; }
        .note-head { stroke: black; stroke-width: 1.5; }
        .note-stem { stroke: black; stroke-width: 1.5; }
        .note-flag { fill: black; stroke: black; }
        .ledger-line { stroke: black; stroke-width: 1; }
        .clef-text, .accidental-text, .rest-text, text {
            font-family: 'Bravura', serif;
            fill: black;
        }
        .clef-text { font-size: 50px; }
        .accidental-text { font-size: 20px; }
        .rest-text { font-size: 30px; }
    `;

    renderButton.addEventListener('click', () => {
        const inputText = noteInput.value.trim();
        renderMusic(inputText);
    });

    function parseInput(text) {
        const measures = text.split(/\n\s*\n/);
        const parsedMeasures = [];
        const noteRegex = /(?<note>\(sus\)|[A-G])(?<accidental>[♭♮♯b#]?)(?<octave>\d)?-(?<dotted>d-)?(?<duration>[whqie])/;
        for (const measure of measures) {
            const lines = measure.split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) continue;
            const measureData = { top: [], bottom: [] };
            const parseLine = (line) => {
                const noteStrings = line.split(',').map(s => s.trim()).filter(Boolean);
                const notes = [];
                noteStrings.forEach(str => {
                    const match = str.match(noteRegex);
                    if (match) {
                        const { note, accidental, octave, dotted, duration } = match.groups;
                        let acc = accidental;
                        if (acc === 'b') acc = '♭';
                        if (acc === '#') acc = '♯';
                        let durVal = durationValues[duration];
                        let isDotted = !!dotted;
                        if (isDotted) durVal *= 1.5;
                        notes.push({ name: note, accidental: acc || null, octave: octave ? parseInt(octave, 10) : null, duration: duration, isDotted: isDotted, durationValue: durVal });
                    }
                });
                return notes;
            };
            if (lines[0]) measureData.top = parseLine(lines[0]);
            if (lines[1]) measureData.bottom = parseLine(lines[1]);
            parsedMeasures.push(measureData);
        }
        return parsedMeasures;
    }

    function renderMusic(text) {
        staffContainer.innerHTML = '';
        downloadSvgButton.disabled = true;
        downloadPngButton.disabled = true;

        const measures = parseInput(text);
        if (measures.length === 0) return;

        const svgWidth = 100 + measures.length * MEASURE_WIDTH;
        const svgHeight = STAFF_TOP_Y * 2 + STAFF_GAP + (4 * LINE_GAP);
        const svg = createSvgElement('svg', { 
            width: svgWidth, 
            height: svgHeight, 
            viewBox: `0 0 ${svgWidth} ${svgHeight}`, 
            style: "background-color: #fff;" 
        });

        const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleElement.textContent = svgStyles;
        const defsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defsElement.appendChild(styleElement);
        svg.appendChild(defsElement);

        drawGrandStaff(svg, svgWidth);

        let currentX = 80;
        measures.forEach(measure => {
            drawMeasure(svg, measure, currentX);
            currentX += MEASURE_WIDTH;
        });

        staffContainer.appendChild(svg);
        downloadSvgButton.disabled = false;
        downloadPngButton.disabled = false;
    }


    function drawGrandStaff(svg, width) {
        for (let i = 0; i < 5; i++) {
            const y1 = STAFF_TOP_Y + i * LINE_GAP;
            const y2 = STAFF_TOP_Y + STAFF_GAP + i * LINE_GAP;
            svg.appendChild(createSvgElement('line', { x1: 10, y1, x2: width - 10, y2: y1, class: 'staff-line' }));
            svg.appendChild(createSvgElement('line', { x1: 10, y1: y2, x2: width - 10, y2, class: 'staff-line' }));
        }
        svg.appendChild(createSvgElement('line', { x1: 10, y1: STAFF_TOP_Y, x2: 10, y2: STAFF_TOP_Y + STAFF_GAP + 4 * LINE_GAP, class: 'measure-line' }));
        const brace = createSvgElement('text', { x: 5, y: STAFF_TOP_Y + STAFF_GAP / 2 + 25, 'font-size': '100px' });
        brace.textContent = '{';
        svg.appendChild(brace);
        const trebleClef = createSvgElement('text', { x: 15, y: STAFF_TOP_Y + 28, class: 'clef-text' });
        trebleClef.textContent = '\u{1D11E}';
        svg.appendChild(trebleClef);
        const bassClef = createSvgElement('text', { x: 15, y: STAFF_TOP_Y + STAFF_GAP + 18, class: 'clef-text' });
        bassClef.textContent = '\u{1D122}';
        svg.appendChild(bassClef);
    }
    
    function drawMeasure(svg, measure, startX) {
        let timeInMeasureTop = 0;
        measure.top.forEach(note => {
            const x = startX + (timeInMeasureTop / 4) * (MEASURE_WIDTH - 20);
            drawNote(svg, note, x, 'treble');
            timeInMeasureTop += note.durationValue;
        });
        let timeInMeasureBottom = 0;
        measure.bottom.forEach(note => {
            const x = startX + (timeInMeasureBottom / 4) * (MEASURE_WIDTH - 20);
            drawNote(svg, note, x, 'bass');
            timeInMeasureBottom += note.durationValue;
        });
        const endX = startX + MEASURE_WIDTH - 10;
        svg.appendChild(createSvgElement('line', { x1: endX, y1: STAFF_TOP_Y, x2: endX, y2: STAFF_TOP_Y + STAFF_GAP + 4 * LINE_GAP, class: 'measure-line' }));
    }

    function drawNote(svg, note, x, clef) {
        if (note.name === '(sus)') {
            drawRest(svg, note, x, clef);
            return;
        }
        const pitchMap = clef === 'treble' ? notePitchesTreble : notePitchesBass;
        const refOctave = clef === 'treble' ? 4 : 2;
        const staffY = clef === 'treble' ? STAFF_TOP_Y : STAFF_TOP_Y + STAFF_GAP;
        const basePitch = pitchMap[note.name];
        const octaveOffset = (note.octave - refOctave) * -OCTAVE_HEIGHT;
        const y = staffY + (LINE_GAP * 4) + basePitch + octaveOffset;
        const noteHead = createSvgElement('ellipse', { cx: x, cy: y, rx: NOTE_HEAD_RX, ry: NOTE_HEAD_RY, class: 'note-head', fill: (note.duration === 'h' || note.duration === 'w') ? 'white' : 'black' });
        if (note.duration !== 'w') {
            const stemHeight = 35;
            const middleLineY = staffY + (LINE_GAP * 2);
            const stemDirection = y <= middleLineY ? 1 : -1;
            const stemX = stemDirection === 1 ? x + NOTE_HEAD_RX -1 : x - NOTE_HEAD_RX + 1;
            const stemY2 = y - (stemHeight * stemDirection);
            svg.appendChild(createSvgElement('line', { x1: stemX, y1: y, x2: stemX, y2: stemY2, class: 'note-stem' }));
            if (note.duration === 'e' || note.duration === 'i') {
                 const flagPath = direction => direction === 1 ? `M${stemX},${stemY2} Q ${stemX + 8},${stemY2 + 10} ${stemX + 2},${stemY2 + 20}` : `M${stemX},${stemY2} Q ${stemX - 8},${stemY2 - 10} ${stemX - 2},${stemY2 - 20}`;
                svg.appendChild(createSvgElement('path', { d: flagPath(stemDirection), class: 'note-flag', 'stroke-width': 1.5 }));
            }
        }
        if (note.accidental) {
            const accidentalText = createSvgElement('text', { x: x - 15, y: y + 5, class: 'accidental-text' });
            accidentalText.textContent = note.accidental;
            svg.appendChild(accidentalText);
        }
        for (let lineY = staffY; lineY >= staffY - LINE_GAP * 3; lineY -= LINE_GAP) {
            if (Math.abs(y - lineY) < 3) svg.appendChild(createSvgElement('line', { x1: x - 10, y1: lineY, x2: x + 10, y2: lineY, class: 'ledger-line' }));
        }
        for (let lineY = staffY + LINE_GAP * 5; lineY <= staffY + LINE_GAP * 8; lineY += LINE_GAP) {
             if (Math.abs(y - lineY) < 3) svg.appendChild(createSvgElement('line', { x1: x - 10, y1: lineY, x2: x + 10, y2: lineY, class: 'ledger-line' }));
        }
        svg.appendChild(noteHead);
        if (note.isDotted) {
            const space = (y - (staffY + Math.round((y-staffY)/LINE_GAP) * LINE_GAP)) > LINE_GAP/2 ? -LINE_GAP/2 : LINE_GAP/2;
            const dotY = Math.round(y/5)*5 + space;
            svg.appendChild(createSvgElement('circle', { cx: x + 10, cy: dotY, r: 2, fill: 'black' }));
        }
    }

    function drawRest(svg, rest, x, clef) {
        const staffY = clef === 'treble' ? STAFF_TOP_Y : STAFF_TOP_Y + STAFF_GAP;
        let restChar = '';
        let y = 0;
        switch (rest.duration) {
            case 'w': restChar = '\u{1D13B}'; y = staffY + LINE_GAP; break;
            case 'h': restChar = '\u{1D13C}'; y = staffY + LINE_GAP * 2; break;
            case 'q': restChar = '\u{1D13D}'; y = staffY + LINE_GAP * 2 + 5; break;
            case 'e': case 'i': restChar = '\u{1D13E}'; y = staffY + LINE_GAP * 2 + 5; break;
            default: return;
        }
        const restEl = createSvgElement('text', { x: x - 5, y: y, class: 'rest-text' });
        restEl.textContent = restChar;
        svg.appendChild(restEl);
    }
    
    function createSvgElement(tag, attributes) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const key in attributes) el.setAttribute(key, attributes[key]);
        return el;
    }

    downloadSvgButton.addEventListener('click', () => {
        const svg = staffContainer.querySelector('svg');
        if (!svg) return;
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svg);
        if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        const blob = new Blob([source], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        triggerDownload(url, 'beste.svg');
        URL.revokeObjectURL(url);
    });

    downloadPngButton.addEventListener('click', () => {
        const svg = staffContainer.querySelector('svg');
        if (!svg) return;
        const canvas = document.createElement('canvas');
        const svgSize = svg.getBoundingClientRect();
        canvas.width = svgSize.width;
        canvas.height = svgSize.height;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svg);
        const blob = new Blob([source], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            const pngUrl = canvas.toDataURL('image/png');
            triggerDownload(pngUrl, 'beste.png');
        };
        img.src = url;
    });

    function triggerDownload(href, filename) {
        const link = document.createElement('a');
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    noteInput.value = `G4-h, E♭4-q, D4-q
C3-w

C4-h, D4-q, E♭4-q
G2-h, B♭2-h`;
    renderButton.click();
});