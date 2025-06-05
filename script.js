document.addEventListener('DOMContentLoaded', () => {
    const COLS = 8;
    const ROWS = 12;
    const BLOCK_SIZE = window.innerWidth < 400 ? 35 : 40;
    const BONUS_CHANCE = 0.1;
    
    const board = document.getElementById('board');
    const scoreDisplay = document.getElementById('score');
    const highscoreDisplay = document.getElementById('highscore');
    const gameOverlay = document.getElementById('game-overlay');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const shopOverlay = document.getElementById('shop-overlay');
    const startBtn = document.getElementById('start-btn');
    const shopBtnMenu = document.getElementById('shop-btn-menu');
    const closeShopBtn = document.getElementById('close-shop-btn');
    const howToPlayBtn = document.getElementById('how-to-play-btn');
    const creditsBtn = document.getElementById('credits-btn');
    const retryBtn = document.getElementById('retry-btn');
    const menuBtn = document.getElementById('menu-btn');
    const finalScoreDisplay = document.getElementById('final-score');
    const shopBlocoinsDisplay = document.getElementById('shop-blocoins');
    
    let boardArray = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let highscore = 0;
    let blocoins = 0;
    let gameInterval = null;
    let dropSpeed = 1000;
    let gameActive = false;
    let touchStartX = 0;
    let touchStartY = 0;
    
    let playerSettings = {
        skin: 'classic',
        multiplier: 1,
        slowMo: false,
        slowMoDuration: 0
    };
    
    const SHAPES = [
        { name: 'I', shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], color: 'I' },
        { name: 'J', shape: [[1,0,0], [1,1,1], [0,0,0]], color: 'J' },
        { name: 'L', shape: [[0,0,1], [1,1,1], [0,0,0]], color: 'L' },
        { name: 'O', shape: [[1,1], [1,1]], color: 'O' },
        { name: 'S', shape: [[0,1,1], [1,1,0], [0,0,0]], color: 'S' },
        { name: 'T', shape: [[0,1,0], [1,1,1], [0,0,0]], color: 'T' },
        { name: 'Z', shape: [[1,1,0], [0,1,1], [0,0,0]], color: 'Z' }
    ];
    
    function vibrate(duration = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }
    
    function loadGame() {
        const savedData = localStorage.getItem('blockTycoonSave');
        if (savedData) {
            const data = JSON.parse(savedData);
            blocoins = data.blocoins || 0;
            highscore = data.highscore || 0;
            playerSettings = data.settings || playerSettings;
            updateDisplays();
        }
    }
    
    function saveGame() {
        const data = {
            blocoins: blocoins,
            highscore: highscore,
            settings: playerSettings
        };
        localStorage.setItem('blockTycoonSave', JSON.stringify(data));
    }
    
    function updateDisplays() {
        scoreDisplay.textContent = `Рахунок: ${score}`;
        highscoreDisplay.textContent = `Рекорд: ${highscore}`;
        if (shopBlocoinsDisplay) {
            shopBlocoinsDisplay.textContent = `Blocoins: ${blocoins}`;
        }
    }
    
    function createBoard() {
        board.innerHTML = '';
        boardArray = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        
        board.classList.add('appearing');
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.id = `cell-${row}-${col}`;
                cell.style.setProperty('--row', row);
                cell.style.setProperty('--col', col);
                board.appendChild(cell);
            }
        }
        
        setTimeout(() => {
            board.classList.remove('appearing');
        }, 1000);
    }
    
    function generatePiece() {
        const randomIndex = Math.floor(Math.random() * SHAPES.length);
        const shape = JSON.parse(JSON.stringify(SHAPES[randomIndex]));
        
        if (Math.random() < BONUS_CHANCE) {
            shape.color = 'bonus';
        }
        
        return shape;
    }
    
    function draw() {
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cell = document.getElementById(`cell-${row}-${col}`);
                cell.className = 'cell';
                if (boardArray[row][col]) {
                    cell.classList.add(boardArray[row][col]);
                }
            }
        }
        
        if (currentPiece) {
            const { shape, row, col, color } = currentPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        const boardRow = row + r;
                        const boardCol = col + c;
                        if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
                            const cell = document.getElementById(`cell-${boardRow}-${boardCol}`);
                            cell.classList.add(color);
                        }
                    }
                }
            }
        }
    }
    
    function collision(row, col, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const newRow = row + r;
                    const newCol = col + c;
                    
                    if (newCol < 0 || newCol >= COLS || newRow >= ROWS) {
                        return true;
                    }
                    
                    if (newRow >= 0 && boardArray[newRow][newCol]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    function rotatePiece() {
        if (!currentPiece || !gameActive) return;
        vibrate();
        
        const newShape = currentPiece.shape[0].map((_, i) => 
            currentPiece.shape.map(row => row[i]).reverse()
        );
        
        if (!collision(currentPiece.row, currentPiece.col, newShape)) {
            currentPiece.shape = newShape;
            draw();
        }
    }
    
    function movePiece(direction) {
        if (!currentPiece || !gameActive) return;
        
        let newRow = currentPiece.row;
        let newCol = currentPiece.col;
        
        switch (direction) {
            case 'left':
                newCol--;
                vibrate(30);
                break;
            case 'right':
                newCol++;
                vibrate(30);
                break;
            case 'down':
                newRow++;
                break;
        }
        
        if (!collision(newRow, newCol, currentPiece.shape)) {
            currentPiece.row = newRow;
            currentPiece.col = newCol;
            draw();
            return true;
        }
        
        if (direction === 'down') {
            lockPiece();
            return false;
        }
        
        return false;
    }
    
    function lockPiece() {
        const { shape, row, col, color } = currentPiece;
        let hasBonus = color === 'bonus';
        
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardRow = row + r;
                    const boardCol = col + c;
                    
                    if (boardRow >= 0) {
                        boardArray[boardRow][boardCol] = hasBonus ? 'bonus' : color;
                    }
                }
            }
        }
        
        checkLines();
        
        currentPiece = {
            ...nextPiece,
            row: 0,
            col: Math.floor(COLS / 2) - Math.floor(nextPiece.shape[0].length / 2)
        };
        nextPiece = generatePiece();
        
        if (collision(currentPiece.row, currentPiece.col, currentPiece.shape)) {
            gameOver();
            return;
        }
    }
    
    function checkLines() {
        let linesCleared = 0;
        let bonusLines = 0;
        
        for (let row = ROWS - 1; row >= 0; row--) {
            if (boardArray[row].every(cell => cell !== 0)) {
                const bonusCells = boardArray[row].filter(cell => cell === 'bonus').length;
                if (bonusCells > 0) bonusLines++;
                
                boardArray.splice(row, 1);
                boardArray.unshift(Array(COLS).fill(0));
                linesCleared++;
                row++;
            }
        }
        
        if (linesCleared > 0) {
            vibrate(100);
            const linePoints = [0, 40, 100, 300, 1200][linesCleared];
            score += linePoints;
            
            const baseBlocoins = linesCleared * 10 + bonusLines * 50;
            const totalBlocoins = Math.floor(baseBlocoins * playerSettings.multiplier);
            blocoins += totalBlocoins;
            
            updateDisplays();
            saveGame();
            animateClear(linesCleared);
        }
    }
    
    function animateClear(lines) {
        const rowsToClear = [];
        
        for (let row = ROWS - 1; row >= ROWS - lines; row--) {
            rowsToClear.push(row);
        }
        
        rowsToClear.forEach(row => {
            for (let col = 0; col < COLS; col++) {
                const cell = document.getElementById(`cell-${row}-${col}`);
                cell.classList.add('clearing');
            }
        });
        
        setTimeout(() => {
            for (let row = 0; row < ROWS - lines; row++) {
                for (let col = 0; col < COLS; col++) {
                    if (boardArray[row][col]) {
                        const cell = document.getElementById(`cell-${row}-${col}`);
                        const dropDistance = (lines * 100) / ROWS;
                        cell.style.setProperty('--drop-distance', `${dropDistance}%`);
                        cell.classList.add('dropping');
                    }
                }
            }
            
            setTimeout(() => {
                rowsToClear.forEach(row => {
                    for (let col = 0; col < COLS; col++) {
                        const cell = document.getElementById(`cell-${row}-${col}`);
                        cell.classList.remove('clearing');
                    }
                });
                
                document.querySelectorAll('.dropping').forEach(cell => {
                    cell.classList.remove('dropping');
                });
                
                draw();
            }, 300);
        }, 300);
    }
    
    function startGame() {
        if (gameActive) return;
        
        gameActive = true;
        score = 0;
        dropSpeed = 1000;
        
        createBoard();
        nextPiece = generatePiece();
        currentPiece = generatePiece();
        currentPiece.row = 0;
        currentPiece.col = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
        
        gameOverlay.style.display = 'none';
        gameOverOverlay.style.display = 'none';
        draw();
        
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(() => movePiece('down'), dropSpeed);
        
        updateDisplays();
    }
    
    function gameOver() {
        vibrate(200);
        gameActive = false;
        clearInterval(gameInterval);
        
        if (score > highscore) {
            highscore = score;
        }
        
        finalScoreDisplay.textContent = `Рахунок: ${score} | Рекорд: ${highscore}`;
        gameOverOverlay.style.display = 'flex';
        saveGame();
    }
    
    function handleTouchStart(e) {
        if (!gameActive) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }
    
    function handleTouchMove(e) {
        if (!gameActive) return;
        e.preventDefault();
    }
    
    function handleTouchEnd(e) {
        if (!gameActive) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > 50) {
                diffX > 0 ? movePiece('right') : movePiece('left');
            }
        } else {
            if (Math.abs(diffY) > 50) {
                diffY > 0 ? movePiece('down') : rotatePiece();
            }
        }
        e.preventDefault();
    }
    
    function openShop() {
        if (gameActive) {
            vibrate();
            alert('🛍️ Магазин доступний лише у головному меню!');
            return;
        }
        vibrate();
        shopOverlay.style.display = 'flex';
        updateDisplays();
    }
    
    function closeShop() {
        vibrate();
        shopOverlay.style.display = 'none';
    }
    
    function buyItem(item, cost) {
        vibrate();
        if (blocoins >= cost) {
            blocoins -= cost;
            
            switch (item) {
                case 'skin1': playerSettings.skin = 'classic'; break;
                case 'skin2': playerSettings.skin = 'pastel'; break;
                case 'slowmo': 
                    playerSettings.slowMo = true;
                    dropSpeed = 1500;
                    if (gameInterval) {
                        clearInterval(gameInterval);
                        gameInterval = setInterval(() => movePiece('down'), dropSpeed);
                    }
                    setTimeout(() => {
                        playerSettings.slowMo = false;
                        dropSpeed = 1000;
                        if (gameInterval) {
                            clearInterval(gameInterval);
                            gameInterval = setInterval(() => movePiece('down'), dropSpeed);
                        }
                    }, 30000);
                    break;
                case 'multiplier': playerSettings.multiplier = 1.5; break;
            }
            
            updateDisplays();
            saveGame();
            alert('🎉 Покупка успішна!');
        } else {
            alert('❌ Недостатньо Blocoins!');
        }
    }
    
    function init() {
        loadGame();
        createBoard();
        
        board.addEventListener('touchstart', handleTouchStart, { passive: false });
        board.addEventListener('touchmove', handleTouchMove, { passive: false });
        board.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        startBtn.addEventListener('click', startGame);
        shopBtnMenu.addEventListener('click', openShop);
        closeShopBtn.addEventListener('click', closeShop);
        retryBtn.addEventListener('click', startGame);
        menuBtn.addEventListener('click', () => {
            gameOverOverlay.style.display = 'none';
            gameOverlay.style.display = 'flex';
        });
        
        howToPlayBtn.addEventListener('click', () => {
            vibrate();
            alert(
                "🎮 Як грати:\n\n" +
                "← → - рухати фігуру\n" +
                "↻ - обертати фігуру\n" +
                "↓ - прискорити падіння"
            );
        });
        
        creditsBtn.addEventListener('click', () => {
            vibrate();
            alert(
                "🛠️ Block Tycoon\n\n" +
                "Автор: Ваш розробник ASTAPENKO M.\n" +
                "Версія: 1.0\n\n" +
                "© 2025 Block Tycoon. Всі права захищені."
            );
        });
        
        document.getElementById('left-btn').addEventListener('click', () => movePiece('left'));
        document.getElementById('right-btn').addEventListener('click', () => movePiece('right'));
        document.getElementById('down-btn').addEventListener('click', () => movePiece('down'));
        document.getElementById('rotate-btn').addEventListener('click', rotatePiece);
        
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const item = this.parentElement.dataset.item;
                const cost = parseInt(this.parentElement.dataset.cost);
                buyItem(item, cost);
            });
        });
        
        updateDisplays();
    }
    
    init();
});
