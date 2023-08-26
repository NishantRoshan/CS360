var gl;
var color;
var animation;
var windMilldegree1 = 0;
var windMilldegree2 = 0;
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

function drawSun(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    sunColor = [254/255,228/255,4/255,1];

    //draw sun
    drawCircle(sunColor, copy);

    //draw rays
    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy, [0.05,3,1]);
    drawSquare(sunColor, copy);
    copy = popMatrix(matrixStack);
    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(45), [0, 0, 1]);
    copy = mat4.scale(copy, [0.05,3,1]);
    drawSquare(sunColor, copy);
    copy = popMatrix(matrixStack);
    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(90), [0, 0, 1]);
    copy = mat4.scale(copy, [0.05,3,1]);
    drawSquare(sunColor, copy);
    copy = popMatrix(matrixStack);
    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(135), [0, 0, 1]);
    copy = mat4.scale(copy, [0.05,3,1]);
    drawSquare(sunColor, copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawBirds(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    birdColor = [0,0,0,1];

    //draw body
    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy,[0.2,0.25,1]);
    drawSquare(birdColor,copy);
    copy = popMatrix(matrixStack);

    //draw wings
    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(10), [0, 0, 1]);
    copy = mat4.translate(copy, [1,0.2,0]);
    copy = mat4.scale(copy,[2,0.3,1]);
    drawTriangle(birdColor,copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(-10), [0, 0, 1]);
    copy = mat4.translate(copy, [-1,0.2,0]);
    copy = mat4.scale(copy,[2,0.3,1]);
    drawTriangle(birdColor,copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawClouds(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.2,0.2,0.2]);

    cloudColor = [1,1,1,1];

    //center clouds
    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(7), [0, 0, 1]);
    copy = mat4.scale(copy,[2,1,1]);
    drawCircle(cloudColor, copy);
    copy = popMatrix(matrixStack);
    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(-7), [0, 0, 1]);
    copy = mat4.translate(copy, [0,1,0]);
    copy = mat4.scale(copy,[2,1,1]);
    drawCircle(cloudColor, copy);
    copy = popMatrix(matrixStack);

    //left cloud
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-3.9,1,0]);
    copy = mat4.scale(copy,[3.8,2,1]);
    drawCircle(cloudColor, copy);
    copy = popMatrix(matrixStack);

    //right cloud
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [2.8,0.6,0]);
    copy = mat4.scale(copy,[1.9,1.2,1]);
    drawCircle(cloudColor, copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawMountains1(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    mountainLight = [150/255,120/255,81/255,1];
    mountainDark = [129/255,90/255,64/255,1];

    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy,[3,1,1]);
    drawTriangle(mountainDark,copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.5,0]);
    copy = mat4.rotate(copy, degToRad(7), [0, 0, 1]);
    copy = mat4.translate(copy, [0,-0.5,0]);
    copy = mat4.scale(copy,[3,1,1]);
    drawTriangle(mountainLight,copy);
    copy = popMatrix(matrixStack);
}

function drawMountains2(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    mountainLight = [150/255,120/255,81/255,1];

    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy,[3,1,1]);
    drawTriangle(mountainLight,copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawTree(mMatrix){
    copy = mat4.create(mMatrix);
    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    stemColor = [127/255,78/255,77/255,1];
    darkGreen = [0,152/255,77/255,1];
    midGreen = [76/255,178/255,75/255,1];
    lightGreen = [102/255,202/255,77/255,1];

    //draw stem
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-0.5,0]);
    copy = mat4.scale(copy, [0.12,1,1]);
    drawSquare(stemColor,copy);
    copy = popMatrix(matrixStack);

    //draw leaves
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.4,0]);
    drawTriangle(darkGreen, copy);
    copy = mat4.translate(copy, [0,0.14,0]);
    copy = mat4.scale(copy, [1.12,1,1]);
    drawTriangle(midGreen, copy);
    copy = mat4.translate(copy, [0,0.17,0]);
    copy = mat4.scale(copy, [1.12,1.1,1]);
    drawTriangle(lightGreen, copy);
    copy = popMatrix(matrixStack);
} 
////////////////////////////////////////////////////////////////////////

function drawWindMill(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    wingColor = [179/255,179/255,0,1];
    centreColor = [0,0,0,1];
    stemColor = [50/255,50/255,50/255,1];

    //draw stem
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-1,0]);
    copy = mat4.scale(copy, [0.15,2.5,1]);
    drawSquare(stemColor, copy);
    copy = popMatrix(matrixStack);

    // draw wings
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.3,0]);
    copy = mat4.rotate(copy, degToRad(0), [0, 0, 1]);
    copy = mat4.translate(copy, [0,-0.3,0]);
    copy = mat4.scale(copy, [0.3,1.2,1]);
    copy = mat4.translate(copy, [0,-0.1/1.2,0]);
    drawTriangle(wingColor, copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.3,0]);
    copy = mat4.rotate(copy, degToRad(90), [0, 0, 1]);
    copy = mat4.translate(copy, [0,-0.3,0]);
    copy = mat4.scale(copy, [0.3,1.2,1]);
    copy = mat4.translate(copy, [0,-0.1/1.2,0]);
    drawTriangle(wingColor, copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.3,0]);
    copy = mat4.rotate(copy, degToRad(-90), [0, 0, 1]);
    copy = mat4.translate(copy, [0,-0.3,0]);
    copy = mat4.scale(copy, [0.3,1.2,1]);
    copy = mat4.translate(copy, [0,-0.1/1.2,0]);
    drawTriangle(wingColor, copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.3,0]);
    copy = mat4.rotate(copy, degToRad(180), [0, 0, 1]);
    copy = mat4.translate(copy, [0,-0.3,0]);
    copy = mat4.scale(copy, [0.3,1.2,1]);
    copy = mat4.translate(copy, [0,-0.1/1.2,0]);
    drawTriangle(wingColor, copy);
    copy = popMatrix(matrixStack);

    // draw centre
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.3,0]);
    copy = mat4.scale(copy, [0.12,0.12,0.12]);
    drawCircle(centreColor, copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawBoat(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    sailColor = [229/255,76/255,0,1];
    rodColor = [0,0,0,1];
    bodyColor = [203/255,203/255,203/255,1];

    // draw body
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-0.1,0]);
    copy = mat4.scale(copy, [1,0.2,1]);
    drawSquare(bodyColor, copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0.5,-0.1,0]);
    copy = mat4.scale(copy, [0.2,0.2,1]);
    copy = mat4.rotate(copy, degToRad(180), [0, 0, 1]);
    drawTriangle(bodyColor, copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-0.5,-0.1,0]);
    copy = mat4.scale(copy, [0.2,0.2,1]);
    copy = mat4.rotate(copy, degToRad(180), [0, 0, 1]);
    drawTriangle(bodyColor, copy);
    copy = popMatrix(matrixStack);

    //draw rod
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.6,0]);
    copy = mat4.scale(copy, [0.05,1.2,1]);
    drawSquare(rodColor, copy);
    copy = popMatrix(matrixStack);
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-0.25,0.55,0]);
    copy = mat4.rotate(copy, degToRad(-25), [0, 0, 1]);
    copy = mat4.scale(copy, [0.02,1.208,1]);
    drawSquare(rodColor, copy);
    copy = popMatrix(matrixStack);

    //draw sail
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0.43,0.6,0]);
    copy = mat4.rotate(copy, degToRad(-90), [0, 0, 1]);
    copy = mat4.scale(copy, [1,0.8,1]);
    drawTriangle(sailColor, copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawBushes(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.2,0.2,0.2]);

    darkGreen = [0,102/255,1/255,1];
    midGreen = [0,152/255,0,1];
    lightGreen = [1/255,179/255,0,1];

    //left bush
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-2.5,-0.3,0]);
    copy = mat4.scale(copy,[1.8,1.3,1]);
    drawCircle(lightGreen, copy);
    copy = popMatrix(matrixStack);

    //right cloud
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [2.5,-0.3,0]);
    copy = mat4.scale(copy,[1.8,1.3,1]);
    drawCircle(darkGreen, copy);
    copy = popMatrix(matrixStack);

    //centre bush
    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy,[2.4,1.7,1]);
    drawCircle(midGreen, copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawHouse(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.45,0.45,0.45]);

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
    copy = mat4.scale(copy, [0.3,0.3,1]);
    drawSquare(windowColor,copy);
    copy = mat4.translate(copy, [-4,0,0]);
    drawSquare(windowColor,copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-0.2,0]);
    copy = mat4.scale(copy, [0.3,0.6,1]);
    drawSquare(windowColor,copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawCar(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    topColor = [203/255,103/255,76/255,1];
    midColor = [2/255,127/255,228/255,1];
    wheelCenterColor = [128/255,128/255,128/255,1];
    wheelCornerColor = [0,0,0,1];

    //draw top
    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy, [0.8,0.8,0.8]);
    drawSquare(topColor, copy);
    copy = mat4.translate(copy, [0.5,0,0]);
    drawTriangle(topColor, copy);
    copy = mat4.translate(copy, [-1,0,0]);
    drawTriangle(topColor, copy);
    copy = popMatrix(matrixStack);

    //draw wheels
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0.5,-0.6,0]);
    copy = mat4.scale(copy, [0.22,0.22,0.22]);
    drawCircle(wheelCornerColor, copy);
    copy = mat4.scale(copy, [0.8,0.8,0.8]);
    drawCircle(wheelCenterColor, copy);
    copy = mat4.translate(copy, [-1/(0.22*0.8),0,0]);
    copy = mat4.scale(copy, [1.25,1.25,1.25]);
    drawCircle(wheelCornerColor, copy);
    copy = mat4.scale(copy, [0.8,0.8,0.8]);
    drawCircle(wheelCenterColor, copy);
    copy = popMatrix(matrixStack);

    //draw mid
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-0.25,0]);
    copy = mat4.scale(copy, [1.5,0.5,1]);
    drawSquare(midColor, copy);
    copy = mat4.translate(copy, [0.5,0,0]);
    copy = mat4.scale(copy, [1/3,1,1]);
    drawTriangle(midColor, copy);
    copy = mat4.translate(copy, [-3,0,0]);
    drawTriangle(midColor, copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawRiver(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);

    riverColor = [1/255,100/255,254/255,1];

    //draw water
    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy, [4,0.6,1]);
    drawSquare(riverColor, copy);
    copy = popMatrix(matrixStack);

    //draw streaks
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.17,0]);
    copy = mat4.scale(copy, [0.8,0.005,1]);
    drawSquare([1,1,1,1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-1.3,0,0]);
    copy = mat4.scale(copy, [0.8,0.007,1]);
    drawSquare([1,1,1,1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [1.3,-0.22,0]);
    copy = mat4.scale(copy, [0.8,0.006,1]);
    drawSquare([1,1,1,1], copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawSky(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);
    
    skyColor = [102/255,203/255,1,1];
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,1,0]);
    copy = mat4.scale(copy, [4,2,1]);
    drawSquare(skyColor, copy);
    copy = popMatrix(matrixStack);
}
////////////////////////////////////////////////////////////////////////

function drawGreenland(mMatrix){
    copy = mat4.create(mMatrix);

    copy = mat4.scale(copy,[0.5,0.5,0.5]);
    
    lightGreen = [6/255,227/255,127/255,1];
    darkGreen = [103/255,178/255,49/255,1];

    //draw light green
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-1,0]);
    copy = mat4.scale(copy, [4,2,1]);
    drawSquare(lightGreen, copy);
    copy = popMatrix(matrixStack);

    //draw dark green
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0.8,-1.9,0]);
    copy = mat4.rotate(copy, degToRad(45), [0, 0, 1]);
    copy = mat4.scale(copy, [5,4,1]);
    drawTriangle(darkGreen, copy);
    copy = popMatrix(matrixStack);
}
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    // stop the current loop of animation
    if (animation) {
        window.cancelAnimationFrame(animation);
    }

    var animate = function () {
        gl.clearColor(0.9, 0.9, 0.8, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // initialize the model matrix to identity matrix
        mat4.identity(mMatrix);

        //draw sky
        pushMatrix(matrixStack, mMatrix);
        drawSky(mMatrix)
        mMatrix = popMatrix(matrixStack);

        //draw mountains
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.75,0.5,1]);
        mMatrix = mat4.translate(mMatrix, [-0.84,0.15,0]);
        drawMountains1(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.6,0.4,1]);
        mMatrix = mat4.translate(mMatrix, [1.3,0.15,0]);
        drawMountains2(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [1,0.85,1]);
        mMatrix = mat4.translate(mMatrix, [0,0.1,0]);
        drawMountains1(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw greenland
        pushMatrix(matrixStack, mMatrix);
        // mMatrix = mat4.scale(mMatrix, [0.6,0.6,1]);
        // mMatrix = mat4.translate(mMatrix, [-1.1,0.15,0]);
        drawGreenland(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw River
        pushMatrix(matrixStack, mMatrix);
        // mMatrix = mat4.scale(mMatrix, [0.6,0.6,1]);
        mMatrix = mat4.translate(mMatrix, [0,-0.18,0]);
        drawRiver(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw Sun
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.22,0.22,1]);
        mMatrix = mat4.translate(mMatrix, [-2.9,3.6,0]);
        drawSun(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw clouds
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.29,0.3,1]);
        mMatrix = mat4.translate(mMatrix, [-2,1.55,0]);
        drawClouds(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw trees
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.7,0.57,1]);
        mMatrix = mat4.translate(mMatrix, [1.1,0.48,0]);
        drawTree(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.8,0.65,1]);
        mMatrix = mat4.translate(mMatrix, [0.6,0.48,0]);
        drawTree(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.55,0.5,1]);
        mMatrix = mat4.translate(mMatrix, [0.45,0.48,0]);
        drawTree(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw birds
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.085,0.085,1]);
        mMatrix = mat4.translate(mMatrix, [1.8,7.5,0]);
        drawBirds(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.05,0.05,1]);
        mMatrix = mat4.translate(mMatrix, [-3,13.8,0]);
        drawBirds(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.05,0.05,1]);
        mMatrix = mat4.translate(mMatrix, [6.5,16,0]);
        drawBirds(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.03,0.04,1]);
        mMatrix = mat4.translate(mMatrix, [1,20,0]);
        drawBirds(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.02,0.03,1]);
        mMatrix = mat4.translate(mMatrix, [6.5,28,0]);
        drawBirds(mMatrix);
        mMatrix = popMatrix(matrixStack);

        // draw boat
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.4,0.4,1]);
        mMatrix = mat4.translate(mMatrix, [-0.9,-0.38,0]);
        drawBoat(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw bushes
        //bottom bush
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.4,0.4,1]);
        mMatrix = mat4.translate(mMatrix, [-0.6,-2.63,0]);
        drawBushes(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //right bush
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.3,0.3,1]);
        mMatrix = mat4.translate(mMatrix, [3.5,-1.7,0]);
        drawBushes(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //house right bush
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.22,0.22,1]);
        mMatrix = mat4.translate(mMatrix, [-1.27,-2.74,0]);
        drawBushes(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //house left bush
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.17,0.17,1]);
        mMatrix = mat4.translate(mMatrix, [-5.1,-3.6,0]);
        drawBushes(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw windMill
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.45,0.45,1]);
        mMatrix = mat4.translate(mMatrix, [1.5,-0.12,0]);
        drawWindMill(mMatrix);
        mMatrix = popMatrix(matrixStack);

        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.45,0.45,1]);
        mMatrix = mat4.translate(mMatrix, [-1,-0.12,0]);
        drawWindMill(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw house
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.5,0.5,1]);
        mMatrix = mat4.translate(mMatrix, [-1.2,-1.14,0]);
        drawHouse(mMatrix);
        mMatrix = popMatrix(matrixStack);

        //draw car
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.45,0.42,1]);
        mMatrix = mat4.translate(mMatrix, [-1.2,-1.85,0]);
        drawCar(mMatrix);
        mMatrix = popMatrix(matrixStack);
        // //draw triangle
        // pushMatrix(matrixStack, mMatrix);
        // mMatrix = mat4.translate(mMatrix, [-0.5, 0.0, 0.0]);
        // mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [0.0, 0.0, 1.0]);
        // mMatrix = mat4.translate(mMatrix, [0.5, 0.0, 0.0]);
        // pushMatrix(matrixStack, mMatrix);
        // mMatrix = mat4.translate(mMatrix, [-0.5, 0.0, 0.0]);
        // mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 1.0]);
        // color = [0.4, 0.9, 0, 1];
        // drawTriangle(color, mMatrix);
        // mMatrix = popMatrix(matrixStack);
        // mMatrix = popMatrix(matrixStack);
        // // console.log(degree1)
        animation = window.requestAnimationFrame(animate);
    };

    animate();
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
  