var spBuf;
var spIndexBuf;
var spNormalBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];

var matrixStack = [];

var gl;
var canvas;

var buf;
var indexBuf;
var cubeNormalBuf;
var aPositionLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;

var face_degree1 = 0.0;
var face_degree0 = 0.0;
var vert_degree1 = 0.0;
var vert_degree0 = 0.0;
var frag_degree1 = 0.0;
var frag_degree0 = 0.0;

var prevMouseX = 0.0;
var prevMouseY = 0.0;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

// specify camera/eye coordinate system parameters
var eyePos = [0.0, 0.3, 2.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var lightpos = [-10,-10,-10];

var lslider = document.getElementById("lightpos");
var camslider = document.getElementById("campos");

lslider.oninput = function() {
  lightpos[0] = -this.value;
  drawScene();
}
camslider.oninput = function() {
    eyePos[2] = this.value;
    drawScene();
}

// Vertex shader code for flat shading
const vscflat = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 pos;

void main() {
  mat4 projectionModelView;
  projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  gl_PointSize=5.0;
  pos = vec3(uVMatrix*uMMatrix*vec4(aPosition,1.0));
}`;

// Fragment shader code for flat shading
const fscflat = `#version 300 es
precision mediump float;
in vec3 pos;
out vec4 fragColor;
uniform vec4 objColor;
uniform vec3 lightpos;

void main() {
  vec3 normal = normalize(cross(dFdx(pos), dFdy(pos)));

  vec3 amb = 0.4*vec3(objColor);

  vec3 lightdr = normalize(-lightpos);
  vec3 color = vec3(objColor);

  vec3 diff = 1.3*max(0.0,dot(lightdr,normal))*color;

  vec3 R = normalize(-reflect(lightdr,normal));
  
  vec3 V = normalize(-pos);


  vec3 spec = 1.2*vec3(1.0,1.0,1.0)*pow(dot(R,V),25.0);

  vec3 finalc = amb + diff + spec;
  fragColor = vec4(finalc, 1.0);
}`;

// Vertex shader code, per vertex shading
const vscvert = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

uniform vec4 objColor;
uniform vec3 lightpos;

out vec3 vertexColor;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  gl_PointSize=5.0;

  vec3 pos = vec3(uVMatrix*uMMatrix*vec4(aPosition,1.0));
  vec3 normal = normalize(mat3(transpose(inverse(uVMatrix*uMMatrix)))*aNormal);

  vec3 amb = 0.4*vec3(objColor);

  vec3 lightdr = vec3(uVMatrix*vec4(lightpos,1.0));
  lightdr = normalize(-lightdr);
  vec3 color = 1.0*vec3(objColor);

  vec3 diff = 1.2*max(0.0,dot(lightdr,normal))*color;

  vec3 R = normalize(-reflect(lightdr,normal));
  vec3 V = normalize(-pos);

  vec3 spec = 1.2*pow(max(dot(R,V),0.0),30.0)*vec3(1.0,1.0,1.0);

  vertexColor = amb + diff + spec;

}`;

// Fragment shader code, per vertex shading
const fscvert = `#version 300 es
precision mediump float;
in vec3 vertexColor;
out vec4 fragColor;
void main() {
  fragColor = vec4(vertexColor, 1.0);
}`;

// Vertex shader code, per fragment shading 
const vscfrag = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;



out vec3 normal;
out vec3 pos;

void main() {
  mat4 projectionModelView;
  projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = normalize(projectionModelView*vec4(aPosition,1.0));
  gl_PointSize=5.0;

  pos = normalize(vec3(uVMatrix*uMMatrix*vec4(aPosition,1.0)));

  normal = normalize(vec3(transpose(inverse(uVMatrix*uMMatrix))*vec4(aNormal,1.0)));

}`;

// Fragment shader code, per fragment shading
const fscfrag = `#version 300 es
precision mediump float;
in vec3 normal;
in vec3 pos;
uniform vec4 objColor;
uniform vec3 lightpos;
out vec4 fragColor;
void main() {

  vec3 amb = 0.4*vec3(objColor);

  vec3 lightdr = normalize(-lightpos);
  vec3 color = vec3(objColor);

  vec3 diff = 1.5*max(0.0,dot(lightdr,normal))*color;

  vec3 R = normalize(-reflect(lightdr,normal));
  vec3 V = normalize(-pos);

  vec3 spec = vec3(1.0,1.0,1.0)*pow(max(0.0,dot(R,V)),25.0);

  vec3 col = amb + diff + spec;
  fragColor = vec4(col, 1.0);

}`;

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

function initShaders(vsc, fsc) {
    shaderProgram = gl.createProgram();
  
    var vertexShader = vertexShaderSetup(vsc);
    var fragmentShader = fragmentShaderSetup(fsc);
  
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

function initSphere(nslices, nstacks, radius) {
  var theta1, theta2;

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(-radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(-1.0);
    spNormals.push(0);
  }

  for (j = 1; j < nstacks - 1; j++) {
    theta1 = (j * 2 * Math.PI) / nslices - Math.PI / 2;
    for (i = 0; i < nslices; i++) {
      theta2 = (i * 2 * Math.PI) / nslices;
      spVerts.push(radius * Math.cos(theta1) * Math.cos(theta2));
      spVerts.push(radius * Math.sin(theta1));
      spVerts.push(radius * Math.cos(theta1) * Math.sin(theta2));

      spNormals.push(Math.cos(theta1) * Math.cos(theta2));
      spNormals.push(Math.sin(theta1));
      spNormals.push(Math.cos(theta1) * Math.sin(theta2));
    }
  }

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(1.0);
    spNormals.push(0);
  }

  // setup the connectivity and indices
  for (j = 0; j < nstacks - 1; j++)
    for (i = 0; i <= nslices; i++) {
      var mi = i % nslices;
      var mi2 = (i + 1) % nslices;
      var idx = (j + 1) * nslices + mi;
      var idx2 = j * nslices + mi;
      var idx3 = j * nslices + mi2;
      var idx4 = (j + 1) * nslices + mi;
      var idx5 = j * nslices + mi2;
      var idx6 = (j + 1) * nslices + mi2;

      spIndicies.push(idx);
      spIndicies.push(idx2);
      spIndicies.push(idx3);
      spIndicies.push(idx4);
      spIndicies.push(idx5);
      spIndicies.push(idx6);
    }
}

function initSphereBuffer() {
  var nslices = 30; // use even number
  var nstacks = nslices / 2 + 1;
  var radius = 1.0;
  initSphere(nslices, nstacks, radius);

  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = nslices * nstacks;

  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = nslices * nstacks;

  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = (nstacks - 1) * 6 * (nslices + 1);
}

// Cube generation function with normals
function initCubeBuffer() {
  var vertices = [
    // Front face
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Back face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // Top face
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Bottom face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Right face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  buf.itemSize = 3;
  buf.numItems = vertices.length / 3;

  var normals = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    // Top face
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Bottom face
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    // Right face
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // Left face
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;


  var indices = [
    0,
    1,
    2,
    0,
    2,
    3, // Front face
    4,
    5,
    6,
    4,
    6,
    7, // Back face
    8,
    9,
    10,
    8,
    10,
    11, // Top face
    12,
    13,
    14,
    12,
    14,
    15, // Bottom face
    16,
    17,
    18,
    16,
    18,
    19, // Right face
    20,
    21,
    22,
    20,
    22,
    23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

function drawCube(color, mMatrix) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(
      aPositionLocation,
      buf.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
    gl.vertexAttribPointer(
      aNormalLocation,
      cubeNormalBuf.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
  
    // draw elementary arrays - triangle indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  
    gl.uniform4fv(uColorLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  
    gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    // gl.drawArrays(gl.LINE_STRIP, 0, buf.numItems); // show lines
    // gl.drawArrays(gl.POINTS, 0, buf.numItems); // show points
  }

function drawSphere(color, mMatrix){
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(
       aPositionLocation,
       spBuf.itemSize,
       gl.FLOAT,
       false,
       0,
       0
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.vertexAttribPointer(
       aNormalLocation,
       spNormalBuf.itemSize,
       gl.FLOAT,
       false,
       0,
       0
    );

    // draw elementary arrays - triangle indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

    gl.uniform4fv(uColorLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

    gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
    // gl.drawArrays(gl.LINE_STRIP, 0, spBuf.numItems); // show lines
    // gl.drawArrays(gl.POINTS, 0, spBuf.numItems); // show points
}


//////////////////////////////////////////////////////////////////////
//Main drawing routine
function drawScene() {
    // You need to enable scissor_test to be able to use multiple viewports
    gl.enable(gl.SCISSOR_TEST);
  
    // set up the view matrix, multiply into the modelview matrix
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);
  
    //set up perspective projection matrix
    mat4.identity(pMatrix);
    pMatrix = mat4.perspective(45, 1.0, 0.1, 1000, pMatrix);
  
    //set up the model matrix
    mat4.identity(mMatrix);
  
    // transformations applied here on model matrix
    
    
    ////////////////////////////////////////
    // Left viewport area
    gl.viewport(0, 0, 500, 500);
    gl.scissor(0, 0, 500, 500);
    gl.clearColor(217/255, 217/255, 241/255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setuniform(flatshaderProgram);
    copy = mat4.create(mMatrix);
    copy = mat4.rotate(copy, degToRad(-60), [0, 1, 0]);
    // copy = mat4.rotate(copy, degToRad(10), [1, 0, 0]);
    copy = mat4.rotate(copy, degToRad(face_degree0), [0, 1, 0]);
    copy = mat4.rotate(copy, degToRad(face_degree1), [1, 0, 0]);
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-0.32,0]);
    copy = mat4.scale(copy,[0.3,0.7,0.3]);
    drawCube([130/255,119/255,14/255,1],copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,0.23,0]);
    copy = mat4.scale(copy,[0.2,0.2,0.2]);
    drawSphere([0,139/255,199/255,1], copy);
    copy = popMatrix(matrixStack);

    ////////////////////////////////////////
    // Middle viewport area
    gl.viewport(500, 0, 500, 500);
    gl.scissor(500, 0, 500, 500);
    gl.clearColor(240/255, 216/255, 215/255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setuniform(vershaderProgram);
    copy = mat4.create(mMatrix);
    copy = mat4.rotate(copy, degToRad(vert_degree0), [0, 1, 0]);
    copy = mat4.rotate(copy, degToRad(vert_degree1), [1, 0, 0]);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0,-0.43,0]);
    copy = mat4.scale(copy,[0.35,0.35,0.35]);
    drawSphere([0.5,0.5,0.5,1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-0.43,-0.1,0]);
    copy = mat4.rotate(copy, degToRad(-25), [0, 0, 1]);
    copy = mat4.rotate(copy, degToRad(-5), [1, 0, 0]);
    copy = mat4.rotate(copy, degToRad(-10), [0, 1, 0]);
    copy = mat4.scale(copy,[0.35,0.35,0.35]);
    drawCube([0,0.5,0,1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-0.28,0.23,0]);
    // copy = mat4.rotate(copy, degToRad(-25), [0, 0, 1]);
    copy = mat4.scale(copy,[0.19,0.19,0.19]);
    drawSphere([0.5,0.5,0.5,1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-0.02,0.41,0]);
    copy = mat4.rotate(copy, degToRad(35), [0, 0, 1]);
    copy = mat4.rotate(copy, degToRad(5), [0, 1, 0]);
    copy = mat4.rotate(copy, degToRad(18), [1, 0, 0]);
    copy = mat4.scale(copy,[0.25,0.25,0.25]);
    drawCube([0,0.5,0,1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-0.13,0.58,0.08]);
    copy = mat4.scale(copy,[0.1,0.1,0.1]);
    drawSphere([0.5,0.5,0.5,1], copy);
    copy = popMatrix(matrixStack);

    ////////////////////////////////////////
    // Right viewport area
    gl.viewport(1000, 0, 500, 500);
    gl.scissor(1000, 0, 500, 500);
    gl.clearColor(216/255, 241/255, 217/255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setuniform(fragshaderProgram);
    copy = mat4.create(mMatrix);
    copy = mat4.rotate(copy, degToRad(frag_degree0), [0, 1, 0]);
    copy = mat4.rotate(copy, degToRad(frag_degree1), [1, 0, 0]);
    copy = mat4.rotate(copy, degToRad(25), [0, 1, 0]);

    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy,[0.2,0.2,0.2]);
    copy = mat4.translate(copy, [0,-2.8,0]);
    drawSphere([0, 0.5, 0, 1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy,[1.4,0.03,0.2]);
    copy = mat4.translate(copy, [0,-11.5,0]);
    drawCube([101/255, 29/255, 3/255, 1], copy);
    copy = popMatrix(matrixStack);
    
    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-0.45,-0.18,0]);
    copy = mat4.scale(copy,[0.15,0.15,0.15]);
    drawSphere([92/255, 79/255, 187/255, 1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0.45,-0.18,0]);
    copy = mat4.scale(copy,[0.15,0.15,0.15]);
    drawSphere([63/255, 99/255, 88/255, 1], copy);
    copy = popMatrix(matrixStack);
    
    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(90), [0, 1, 0]);
    copy = mat4.scale(copy,[1.4,0.03,0.2]);
    copy = mat4.translate(copy, [0,-0.5,-2.25]);
    drawCube([130/255,119/255,14/255,1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.rotate(copy, degToRad(90), [0, 1, 0]);
    copy = mat4.scale(copy,[1.4,0.03,0.2]);
    copy = mat4.translate(copy, [0,-0.5,2.25]);
    drawCube([27/255,126/255,97/255,1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [-0.45,0.15,0]);
    copy = mat4.scale(copy,[0.15,0.15,0.15]);
    drawSphere([136/255, 5/255, 132/255, 1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.translate(copy, [0.45,0.15,0]);
    copy = mat4.scale(copy,[0.15,0.15,0.15]);
    drawSphere([132/255, 87/255, 16/255, 1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy,[1.4,0.03,0.2]);
    copy = mat4.translate(copy, [0,10.5,0]);
    drawCube([101/255, 29/255, 3/255, 1], copy);
    copy = popMatrix(matrixStack);

    pushMatrix(matrixStack,copy);
    copy = mat4.scale(copy,[0.2,0.2,0.2]);
    copy = mat4.translate(copy, [0,2.65,0]);
    drawSphere([132/255, 118/255, 163/255, 1], copy);
    copy = popMatrix(matrixStack);
  }
  
  function onMouseDown(event) {
    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("mouseout", onMouseOut, false);
  
    if (
      event.layerX <= canvas.width &&
      event.layerX >= 0 &&
      event.layerY <= canvas.height &&
      event.layerY >= 0
    ) {
      prevMouseX = event.clientX;
      prevMouseY = canvas.height - event.clientY;
    }
  }
  
  function onMouseMove(event) {
    // make mouse interaction only within canvas
    if (
      event.layerX <= canvas.width &&
      event.layerX >= 0 &&
      event.layerY <= canvas.height &&
      event.layerY >= 0
    ) {
      var mouseX = event.clientX;
      var diffX1 = mouseX - prevMouseX;
      prevMouseX = mouseX;
  
      var mouseY = canvas.height - event.clientY;
      var diffY2 = mouseY - prevMouseY;
      prevMouseY = mouseY;

      if(event.layerX <= canvas.width/3){
        face_degree0 += diffX1 / 5;
        face_degree1 -= diffY2 / 5;
      } else if(event.layerX <= 2*canvas.width/3){
        vert_degree0 += diffX1 / 5;
        vert_degree1 -= diffY2 / 5;
      } else {
        frag_degree0 += diffX1 / 5;
        frag_degree1 -= diffY2 / 5;
      }
      drawScene();
    }
  }
  
  function onMouseUp(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
  }
  
  function onMouseOut(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
  }

function setuniform(shaderProgram){
    gl.useProgram(shaderProgram);
    gl.enable(gl.DEPTH_TEST);
    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
    uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
    uLightPosLoc = gl.getUniformLocation(shaderProgram,"lightpos");

  
    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);

    gl.uniform3fv(uLightPosLoc, lightpos);
    mat4.identity(mMatrix);
}
  
  // This is the entry point from the html
  function webGLStart() {
    canvas = document.getElementById("assignment2");
    document.addEventListener("mousedown", onMouseDown, false);
    
    // initialize WebGL
    initGL(canvas);
  
    // initialize shader program
    flatshaderProgram = initShaders(vscflat, fscflat);
    vershaderProgram = initShaders(vscvert, fscvert);
    fragshaderProgram = initShaders(vscfrag, fscfrag);
  

    //initialize buffers for the cube and sphere
    initCubeBuffer();
    initSphereBuffer();
    drawScene();
  }
  