let score = 0;

(() => {
  const Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Body = Matter.Body,
    Bodies = Matter.Bodies,
    Events = Matter.Events,
    Composite = Matter.Composite;

  const parent = document.getElementById("game");
  const canvas = document.getElementById("canvas");
  var gameOverlayer = document.getElementById("overlay");
  const floor = document.getElementById("floor");

  const ctx = canvas.getContext("2d");

  const engine = Engine.create();

  const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: 480,
      height: 880,
      wireframes: false,
    },
  });

  const ballContours = {
    '1': [[104, 18], [18, 109], [20, 166], [61, 225], [153, 254], [219, 222], [253, 160], [207, 53], [127, 26]],
    '2': [[61, 19], [22, 80], [18, 205], [45, 195], [132, 246], [223, 227], [251, 160], [232, 81], [117, 14]],
    '3': [[125, 5], [19, 131], [14, 182], [71, 234], [195, 234], [233, 207], [244, 126], [181, 61], [165, 17]],
    '4': [[54, 93], [27, 226], [151, 253], [210, 233], [206, 194], [212, 239], [242, 222], [211, 76], [120, 53]],
    '5': [[18, 22], [18, 22], [6, 61], [61, 49], [10, 221], [222, 244], [252, 137], [206, 10], [170, 41]],
    '6': [[206, 18], [68, 69], [161, 0], [28, 11], [6, 82], [57, 77], [7, 143], [48, 252], [255, 112]],
    '7': [[172, 40], [174, 67], [151, 47], [114, 68], [63, 85], [30, 204], [99, 250], [196, 248], [216, 76]],
    '8': [[210, 84], [206, 109], [160, 51], [46, 116], [33, 228], [58, 240], [64, 239], [144, 252], [205, 240]],
    '9': [[232, 54], [232, 54], [86, 73], [86, 73], [35, 222], [35, 222], [89, 253], [89, 253], [237, 240]],
    '10': [[51, 64], [51, 64], [16, 124], [17, 219], [144, 253], [144, 253], [243, 214], [223, 66], [157, 44]],
    '11': [[0, 0], [0, 0], [0, 0], [0, 255], [0, 255], [0, 255], [255, 255], [255, 255], [255, 0]]
  };
  
  async function registerScore(score) {
    // 점수를 Firestore에 등록
    const leaderboardRef = db.collection("leaderboard");
    await leaderboardRef.add({ score: score });
  
    // 상위 몇%인지 계산
    const q = leaderboardRef.orderBy("score", "desc");
    const scoresSnapshot = await q.get();
    let totalUsers = scoresSnapshot.size;
    let higherScores = 0;
  
    scoresSnapshot.forEach((doc) => {
      if (doc.data().score > score) {
        higherScores++;
      }
    });
  
    let percentile = ((totalUsers - higherScores) / totalUsers) * 100;
  
    // 결과 표시
    percentileText = `전 세계 ${percentile.toFixed(2)}%의 유저를 이겼습니다.`;
  }

  const times = [];
  let fps = 100;

  let mousePos;
  let isClicking = false;
  let isMouseOver = false;
  let newSize = 1;

  let isGameOver = false;

  let isLineEnable = false;

  let percentileText = "";  // 게임이 오버될 때 여기에 백분위 정보를 저장합니다.

  const backgroundImage = new Image();
  backgroundImage.src = 'assets/canvas.png';
  const background = Bodies.rectangle(240, 360, 500, 1200, {
      isStatic: true,
      render: {
          sprite: {
              texture: backgroundImage.src, // 이미지 URL 설정
          },
      },
  });
  background.collisionFilter = {
    group: 0,
    category: 1,
    mask: -2,
  };
  const ground = Bodies.rectangle(400, 1220, 810, 680, {
    isStatic: true,
    render: { fillStyle: "transpert" },
  });
  const wallLeft = Bodies.rectangle(-50, 480, 100, 1000, {
    isStatic: true,
    render: { fillStyle: "transpert" },
  });
  const wallRight = Bodies.rectangle(530, 480, 100, 1000, {
    isStatic: true,
    render: { fillStyle: "transpert" },
  });
  World.add(engine.world, [wallLeft, wallRight, ground, background]);

  Engine.run(engine);
  Render.run(render);

  resize();

  refreshLoop();

  init();

  window.addEventListener("resize", resize);

  addEventListener("mousedown", () => {
    if (isGameOver) return;

    isClicking = isMouseOver;
  });
  addEventListener("touchstart", (e) => {
    if (isGameOver) return;

    isClicking = true;
    mousePos = e.touches[0].clientX / parent.style.zoom;
  });

  addEventListener("mouseup", () => {
    if (isGameOver) return;

    isClicking = false;
  });
  addEventListener("touchend", () => {
    if (isGameOver) return;

    isClicking = false;

    if (isGameOver) return;

    if (ball != null) {
      ball.createdAt = 0;
      ball.collisionFilter = {
        group: 0,
        category: 1,
        mask: -1,
      };
      Body.setVelocity(ball, { x: 0, y: (100 / fps) * 5.5 });
      ball = null;

      newSize = Math.ceil(Math.random() * 5);

      setTimeout(() => createNewBall(newSize), 500);
    }
  });

  addEventListener("mousemove", (e) => {
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    mousePos = e.clientX / parent.style.zoom - rect.left;
  });
  addEventListener("touchmove", (e) => {
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    mousePos = e.touches[0].clientX / parent.style.zoom - rect.left;
  });

  addEventListener("click", () => {
    if (isGameOver || !isMouseOver) return;

    if (ball != null) {
      ball.createdAt = 0;
      ball.collisionFilter = {
        group: 0,
        category: 1,
        mask: -1,
      };
      Body.setVelocity(ball, { x: 0, y: (100 / fps) * 5.5 });
      ball = null;

      newSize = Math.ceil(Math.random() * 5);

      setTimeout(() => createNewBall(newSize), 500);
    }
  });

  canvas.addEventListener("mouseover", () => {
    isMouseOver = true;
  });

  canvas.addEventListener("mouseout", () => {
    isMouseOver = false;
  });

  Events.on(engine, "beforeUpdate", () => {
    if (isGameOver) return;

    if (ball != null) {
      const gravity = engine.world.gravity;
      Body.applyForce(ball, ball.position, {
        x: -gravity.x * gravity.scale * ball.mass,
        y: -gravity.y * gravity.scale * ball.mass,
      });

      if (isClicking && mousePos !== undefined) {
        ball.position.x = mousePos;

        if (mousePos > 455) ball.position.x = 455;
        else if (mousePos < 25) ball.position.x = 25;
      }

      ball.position.y = 50;
    }

    isLineEnable = false;
    const bodies = Composite.allBodies(engine.world);
    for (let i = 4; i < bodies.length; i++) {
      body = bodies[i];

      if (body.position.y < 115) {
        if (
          body !== ball &&
          Math.abs(body.velocity.x) < 0.2 &&
          Math.abs(body.velocity.y) < 0.2
        ) {
          gameOver();
        }
      } else if (body.position.y < 250) {
        if (
          body !== ball &&
          Math.abs(body.velocity.x) < 0.5 &&
          Math.abs(body.velocity.y) < 0.5
        ) {
          isLineEnable = true;
        }
      }
    }
  });

  Events.on(engine, "collisionActive", collisionEvent);
  Events.on(engine, "collisionStart", collisionEvent);

  let animations = [];

  function collisionEvent(e) {
    if (isGameOver) return;

    e.pairs.forEach((collision) => {
        let bodies = [collision.bodyA, collision.bodyB];

        // 볼이 이미 합쳐진 상태인지 확인
        if (bodies[0].merged || bodies[1].merged) return;

        if (bodies[0].size === undefined || bodies[1].size === undefined) return;

        if (bodies[0].size === bodies[1].size) {
            let allBodies = Composite.allBodies(engine.world);
            if (allBodies.includes(bodies[0]) && allBodies.includes(bodies[1])) {
                
                // 볼을 합쳐진 상태로 표시
                bodies[0].merged = true;
                bodies[1].merged = true;
                
                const mergePos = {
                    x: (bodies[0].position.x + bodies[1].position.x) / 2,
                    y: (bodies[0].position.y + bodies[1].position.y) / 2
                };
                const maxHoleSize = Math.max(bodies[0].size * 10 * 1.5, bodies[1].size * 10 * 1.5);
                let holeSize = 0;

                animations.push({
                    type: 'hole',
                    position: mergePos,
                    holeSize: holeSize,
                    maxHoleSize: maxHoleSize,
                    bodies: [bodies[0], bodies[1]],
                    newSize: bodies[0].size-1 === 11 ? 1 : bodies[0].size + 1
                });

                let audioFile; 
               
                if (newSize >= 1 && newSize <= 4) {
                  audioFile="assets/pop1.wav";
                } else if (newSize >= 5 && newSize <= 8) {
                  audioFile="assets/pop2.wav";
                } else if (newSize >= 9 && newSize <= 11) {
                  audioFile="assets/pop3.wav";
                }
    
                const audio=new Audio(audioFile);
                audio.play();
            }
        }
    });
}


  Events.on(render, "afterRender", () => {
    if (isGameOver) {
      ctx.fillStyle = "#ffffff55";
      ctx.rect(0, 0, 480, 880);
      ctx.fill();

      writeTextEnd("Game Over", "center", 240, 280, 50);
      writeTextEnd("Score: " + score, "center", 240, 320, 30);
      writeTextEnd(percentileText, "center", 240, 380, 20);  // 백분위 정보를 그립니다.
    } else {
      writeText(score, "start", 25, 60, 40);

      if (isLineEnable) {
        ctx.strokeStyle = "#f55";
        ctx.beginPath();
        ctx.moveTo(0, 100);
        ctx.lineTo(480, 100);
        ctx.stroke();
      }
    }
    for (let i = animations.length - 1; i >= 0; i--) {
        const animation = animations[i];

        if (animation.type === 'hole') {
            ctx.beginPath();
            ctx.arc(animation.position.x, animation.position.y, animation.holeSize, 0, Math.PI * 2, false);
            ctx.fillStyle = "rgba(255,255,255, 0.7)";  // 투명한 원 색상 설정
            ctx.fill();

            animation.holeSize += animation.maxHoleSize / 5;

            if (animation.holeSize >= animation.maxHoleSize) {
                World.remove(engine.world, animation.bodies[0]);
                World.remove(engine.world, animation.bodies[1]);
                World.add(
                    engine.world,
                    newBall(animation.position.x, animation.position.y, animation.newSize)
                );
                score += animation.newSize;

                animations.splice(i, 1);
            }
        }
    }
  });

  function writeText(text, textAlign, x, y, size) {
    ctx.font = `${size}px NanumSquare`;
    ctx.textAlign = textAlign;
    ctx.lineWidth = size / 8;

    ctx.strokeStyle = "#77d2ff";
    ctx.strokeText(text, x, y);

    ctx.fillStyle = "#fff";
    ctx.fillText(text, x, y);
  }

  function writeTextEnd(text, textAlign, x, y, size) {
    ctx.font = `${size}px NanumSquare`;
    ctx.textAlign = textAlign;
    ctx.lineWidth = size / 8;

    ctx.strokeStyle = "#0e0f37";
    ctx.strokeText(text, x, y);

    ctx.fillStyle = "#fff";
    ctx.fillText(text, x, y);
  }

  function resize() {
    canvas.height = 880;
    canvas.width = 480;

    if (isMobile()) {
      parent.style.zoom = window.innerWidth / 480;
      parent.style.top = "0px";

      floor.style.height = `${
        (window.innerHeight - canvas.height * parent.style.zoom) /
        parent.style.zoom
      }px`;
    } else {
      parent.style.zoom = window.innerHeight / 720 / 1.3;
      parent.style.top = `${(canvas.height * parent.style.zoom) / 15}px`;

      floor.style.height = `${
        (window.innerHeight - canvas.height * parent.style.zoom) /
        parent.style.zoom
      }px`;
    }

    Render.setPixelRatio(render, parent.style.zoom * 2);
  }

  function refreshLoop() {
    window.requestAnimationFrame(() => {
      const now = performance.now();
      while (times.length > 0 && times[0] <= now - 1000) {
        times.shift();
      }
      times.push(now);
      fps = times.length;
      refreshLoop();
    });
  }

  function isMobile() {
    return window.innerHeight / window.innerWidth >= 1.49;
  }

  function init() {
    isGameOver = false;
    ball = null;
    engine.timing.timeScale = 1;
    score = 0;

    gameOverlayer.style.display = "none";

    while (engine.world.bodies.length > 4) {
      engine.world.bodies.pop();
    }

    newSize = Math.ceil(Math.random() * 5);
    createNewBall(newSize);
  }

  function gameOver() {
    isGameOver = true;
    engine.timing.timeScale = 0;

    gameOverlayer.style.display = "";

    if (ball != null) World.remove(engine.world, ball);

    registerScore(score);
  }

  function createNewBall(size) {
    ball = newBall(render.options.width / 2, 50, size);
    ball.collisionFilter = {
      group: -1,
      category: 2,
      mask: 0,
    };

    World.add(engine.world, ball);
  }

  function newBall(x, y, size) {
    if (size === 1) size = 2;  // Adjust the first size to the second size
    
    if((size-1)==3) {
      let polyBody;
  
      const radius = size*11; // Adjust this value for the desired size of the nonagon
        polyBody = Bodies.polygon(x, y, 9, radius, {
            render: {
                sprite: {
                    texture: `assets/img/${size-1}.png`,
                    xScale: size / 12.75 * 1.2,  // Scale by 1.1
                    yScale: size / 12.75 * 1.2,  // Scale by 1.1
                },
            }
      });
  
      // Add attributes to the body
      polyBody.size = size;
      polyBody.createdAt = Date.now();
      polyBody.restitution = 0.2;
      polyBody.friction = 0.6;
      polyBody.merged = false;
  
      return polyBody;
    }else{
      c = Bodies.circle(x, y, size * 10 * 1.1, {  // 1.1배로 늘림
        render: {
          sprite: {
            texture: `assets/img/${size-1}.png`,
            xScale: size / 12.75 * 1.1,  // 1.1배로 늘림
            yScale: size / 12.75 * 1.1,  // 1.1배로 늘림
          },
        },
      });
      c.size = size;
      c.createdAt = Date.now();
      c.restitution = 0.2;
      c.friction = 0.6;
      c.merged = false;
      return c;
    }
  }
})();

function shareScore() {
  // score는 전역 변수로 저장되어 있어야 합니다.
  const shareText = `버블 아카이브 : ${score}pt 달성! https://yuuka0314.github.io/bubblearchive/`;

  // 클립보드에 텍스트 복사
  navigator.clipboard.writeText(shareText).then(function() {
    alert("클립보드에 공유 텍스트가 복사되었습니다.");
  }).catch(function(err) {
    console.error("텍스트 복사 실패:", err);
  });
}