var gl;
var color;
var animation;
var degree0 = 0;
var degree1 = 0;
var matrixStack = [];

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var circleBuf;
var circleIndexBuf;
var sqVertexPositionBuffer;
var sqVertexIndexBuffer;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 10.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
    //necessary because javascript only does shallow push
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}
  
function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
}
  
function fragmentShaderSetup(fragShaderCode) {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
}
  
function initShaders() {
    shaderProgram = gl.createProgram();
  
    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);
  
    // attach the shaders
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //link the shader program
    gl.linkProgram(shaderProgram);
  
    // check for compilation and linking status
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.log(gl.getShaderInfoLog(vertexShader));
      console.log(gl.getShaderInfoLog(fragmentShader));
    }
  
    //finally use the program.
    gl.useProgram(shaderProgram);
  
    return shaderProgram;
}

function initGL(canvas) {
    try {
      gl = canvas.getContext("webgl2"); // the graphics webgl2 context
      gl.viewportWidth = canvas.width; // the width of the canvas
      gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
      alert("WebGL initialization failed");
    }
  }

function initSquareBuffer() {
    // buffer for point locations
    const sqVertices = new Float32Array([
      0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 2;
    sqVertexPositionBuffer.numItems = 4;
  
    // buffer for point indices
    const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;
}
  
function drawSquare(color, mMatrix) {
gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

// buffer for point locations
gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
);
  
    // buffer for point indices
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

gl.uniform4fv(uColorLoc, color);

// now draw the square
gl.drawElements(
    gl.TRIANGLES,
    sqVertexIndexBuffer.numItems,
    gl.UNSIGNED_SHORT,
    0
);
}
  
function initTriangleBuffer() {
    // buffer for point locations
    const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
    triangleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    triangleBuf.itemSize = 2;
    triangleBuf.numItems = 3;

    // buffer for point indices
    const triangleIndices = new Uint16Array([0, 1, 2]);
    triangleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
    triangleIndexBuf.itemsize = 1;
    triangleIndexBuf.numItems = 3;
}
  
function drawTriangle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.vertexAttribPointer(
        aPositionLocation,
        triangleBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

    gl.uniform4fv(uColorLoc, color);

    // now draw the square
    gl.drawElements(
        gl.TRIANGLES,
        triangleIndexBuf.numItems,
        gl.UNSIGNED_SHORT,
        0
    );
}

function initCircleBuffer(){
    const circleVertices = new Float32Array(202);
    circleVertices[0] = 0.0;
    circleVertices[1] = 0.0;
    for(let i=1; i<101; i++){
        circleVertices[2*i] = Math.cos(((i-1)*2*Math.PI)/100);
        circleVertices[2*i+1] = Math.sin(((i-1)*2*Math.PI)/100);
    }
    circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);
    circleBuf.itemSize = 2;
    circleBuf.numItems = 101;
  
    // buffer for point indices
    const circleIndices = new Uint16Array(300);
    for(let i=0; i<100; i++){
        circleIndices[3*i] = 0;
        circleIndices[3*i + 1] = i+1;
        if(i==99)
        circleIndices[3*i + 2] = 1;
        else
        circleIndices[3*i + 2] = i+2;
    }
    circleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, circleIndices, gl.STATIC_DRAW);
    circleIndexBuf.itemsize = 1;
    circleIndexBuf.numItems = 300;
}

function drawCircle(color, mMatrix){
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.vertexAttribPointer(
        aPositionLocation,
        circleBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );
        // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);

    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    gl.drawElements(
        gl.TRIANGLES,
        circleIndexBuf.numItems,
        gl.UNSIGNED_SHORT,
        0
    );
}
////////////////////////////////////////////////////////////////////////

function drawHouse(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    roofColor = [253/255,76/255,0,1];
    wallColor = [227/255,227/255,227/255,1];
    windowColor = [229/255,179/255,2/255,1];

    // draw roof
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0.9,1,0]);
    drawTriangle(roofColor, copy);
    copy = mat4.translate(copy, [-1.8,0,0]);
    drawTriangle(roofColor, copy);
    copy = mat4.translate(copy, [0.9,0,0]);
    copy = mat4.scale(copy, [1.8,1,1]);
    drawSquare(roofColor, copy);
    copy = popMatrix(matrixStack);

    // draw wall
    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy, [2,1,1]);
    drawSquare(wallColor, copy);
    copy = popMatrix(matrixStack);

    //draw window
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0.6,0.1,0]);
    copy = mat4.scale(copy, [0.2,0.2,1]);
    drawSquare(windowColor,copy);
    copy = mat4.translate(copy, [-6,0,0]);
    drawSquare(windowColor,copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-0.2,0]);
    copy = mat4.scale(copy, [0.2,0.6,1]);
    drawSquare(windowColor,copy);
    copy = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.9, 0.9, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
  
    //// This translation applies to both the objects below
    // mMatrix = mat4.translate(mMatrix, [0.0, 0.2, 0]);
  
    pushMatrix(matrixStack, mMatrix);
    color = [253/255,76/255,0,1];
    // //local rotation operation for the square
    // mMatrix = mat4.rotate(mMatrix, degToRad(20), [0, 0, 1]);
    // //local scale operation for the square
    // mMatrix = mat4.scale(mMatrix, [0.5, 1, 1.0]);
    drawHouse(mMatrix);
    mMatrix = popMatrix(matrixStack);
  
    pushMatrix(matrixStack, mMatrix);
    // //local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [0, 0.0, 0]);
    // //local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [1.0, 1, 1.0]);
    color = [0.4, 0.9, 0, 1];
    // drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    // //local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [0.5, 0.5, 0]);
    // //local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
    color = [0.4, 0.9, 1, 1];
    // drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
  }

  // This is the entry point from the html
function webGLStart() {
    var canvas = document.getElementById("assignment1");
    initGL(canvas);
    shaderProgram = initShaders();
  
    //get locations of attributes declared in the vertex shader
    const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  
    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
  
    uColorLoc = gl.getUniformLocation(shaderProgram, "color");
  
    initSquareBuffer();
    initTriangleBuffer();
    initCircleBuffer()
    drawScene();
  }
  