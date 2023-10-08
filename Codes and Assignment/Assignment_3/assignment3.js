var spBuf;
var spIndexBuf;
var spNormalBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];

var matrixStack = [];

var gl;
var canvas;

var zAngle = 0.0;
var yAngle = 0.0;

var buf;
var indexBuf;
var cubeNormalBuf;
var aPositionLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;

var cubeMapPath = "./texture_and_other_files/Nvidia_cubemap/";
var posx, posy, posz, negx, negy, negz;
var posx_file = cubeMapPath.concat("posx.jpg");
var posy_file = cubeMapPath.concat("posy.jpg");
var posz_file = cubeMapPath.concat("posz.jpg");
var negx_file = cubeMapPath.concat("negx.jpg");
var negy_file = cubeMapPath.concat("negy.jpg");
var negz_file = cubeMapPath.concat("negz.jpg");
var animation;

var cubeMapTexture;
var input_JSON = "texture_and_other_files/teapot.json";

var eyeAng = 0;
var eyeStep = .003;

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
var eyePos = [0.0, 1.5, 3.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var lightpos = [-10,-10,-10];

var lslider = document.getElementById("lightpos");
// var camslider = document.getElementById("campos");

lslider.oninput = function() {
  lightpos[0] = -this.value;
  drawScene();
}
// camslider.oninput = function() {
//     eyePos[2] = this.value;
//     drawScene();
// }

// Vertex shader code, per fragment shading 
const vscfrag = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTextC;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;



out vec3 normal;
out vec3 wnormal;
out vec3 pos;
out vec3 wpos;
out vec2 oTex;

void main() {
    mat4 projectionModelView;
    projectionModelView=uPMatrix*uVMatrix*uMMatrix;
    gl_Position = projectionModelView*vec4(aPosition,1.0);
    gl_PointSize=5.0;

    pos = vec3(uVMatrix*uMMatrix*vec4(aPosition,1.0));

    normal = normalize(vec3(transpose(inverse(uVMatrix*uMMatrix))*vec4(aNormal,1.0)));
    wnormal = vec3(transpose(inverse(uMMatrix))*vec4(aNormal,1.0));
    wpos = vec3(uMMatrix*vec4(aPosition,1.0));
    oTex = aTextC;
}`;

// Fragment shader code, per fragment shading
const fscfrag = `#version 300 es
precision highp float;
in vec3 normal;
in vec3 wnormal;
in vec3 pos;
in vec3 wpos;
in vec2 oTex;

uniform vec4 objColor;
uniform vec3 lightpos;
uniform sampler2D imageT;
uniform bool EnvTex;
uniform bool Phong;
uniform bool SelfTex;
uniform bool ref;
out vec4 fragColor;

uniform samplerCube cubeMap;
uniform vec3 eyePos;

void main() {
    vec3 lightdr = normalize(-lightpos);
    vec3 R = normalize(-reflect(lightdr,normal));
    vec3 V = normalize(-pos);
    vec3 col = vec3(0.0, 0.0, 0.0);

    if (Phong){
        vec3 amb = vec3(objColor);

        
        vec3 color = vec3(objColor);

        vec3 diff = .5*max(0.0,dot(lightdr,normal))*color;


        vec3 spec = vec3(1.0,1.0,1.0)*pow(max(0.0,dot(R,V)),25.0);
        col += amb + diff + spec;
    }
    if(SelfTex){
        col += vec3(texture(imageT, oTex));
    }

    if(EnvTex){
        if(ref)
          if(SelfTex)
            col += 0.3*vec3(texture(cubeMap,-normalize(reflect(wpos-eyePos,normalize(wnormal)))));
          else
            col += vec3(texture(cubeMap,-normalize(reflect(wpos-eyePos,normalize(wnormal)))));
        else
            col += vec3(texture(cubeMap,normalize(refract(-normalize(wpos-eyePos),normalize(wnormal),0.82))));
    }
    fragColor = vec4(col, 1.0);

}`;

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(shader));
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
      console.log(gl.getShaderInfoLog(shader));
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
      console.log("WebGL initialization failed");
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
    spVerts = [];
    spIndicies = [];
    spNormals = [];
    spTexCoords = [];
    for (var i = 0; i <= nslices; i++) {
      var angle = (i * Math.PI) / nslices;
      var comp1 = Math.sin(angle);
      var comp2 = Math.cos(angle);
  
      for (var j = 0; j <= nstacks; j++) {
        var phi = (j * 2 * Math.PI) / nstacks;
        var comp3 = Math.sin(phi);
        var comp4 = Math.cos(phi);
  
        var xcood = comp4 * comp1;
        var ycoord = comp2;
        var zcoord = comp3 * comp1;
        var utex = 1 - j / nstacks;
        var vtex = 1 - i / nslices;
  
        spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
        spNormals.push(xcood, ycoord, zcoord);
        spTexCoords.push(utex, vtex);
      }
    }
  
    // now compute the indices here
    for (var i = 0; i < nslices; i++) {
      for (var j = 0; j < nstacks; j++) {
        var id1 = i * (nstacks + 1) + j;
        var id2 = id1 + nstacks + 1;
  
        spIndicies.push(id1, id2, id1 + 1);
        spIndicies.push(id2, id2 + 1, id1 + 1);
      }
    }
  }
  
  function initSphereBuffer() {
    var nslices = 50;
    var nstacks = 50;
    var radius = 1.0;
  
    initSphere(nslices, nstacks, radius);
  
    // buffer for vertices
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
    spBuf.itemSize = 3;
    spBuf.numItems = spVerts.length / 3;
  
    // buffer for indices
    spIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(spIndicies),
      gl.STATIC_DRAW
    );
    spIndexBuf.itemsize = 1;
    spIndexBuf.numItems = spIndicies.length;
  
    // buffer for normals
    spNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
    spNormalBuf.itemSize = 3;
    spNormalBuf.numItems = spNormals.length / 3;
  
    // buffer for texture coordinates
    spTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
    spTexBuf.itemSize = 2;
    spTexBuf.numItems = spTexCoords.length / 2;
  }
  
  function drawSphere(color) {
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
  
    gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
    gl.vertexAttribPointer(
      aTextCLocation,
      spTexBuf.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
  
    // Draw elementary arrays - triangle indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  
    gl.uniform4fv(uColorLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  
    
  
    gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
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
  
    var texCoords = [
      // Front face
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      // Back face
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      // Top face
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      // Bottom face
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      // Right face
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      // Left face
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    ];
    cubeTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    cubeTexBuf.itemSize = 2;
    cubeTexBuf.numItems = texCoords.length / 2;
  
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


  function initObject() {
    // XMLHttpRequest objects are used to interact with servers
    // It can be used to retrieve any type of data, not just XML.
    var request = new XMLHttpRequest();
    request.open("GET", input_JSON);
    // MIME: Multipurpose Internet Mail Extensions
    // It lets users exchange different kinds of data files
    request.overrideMimeType("application/json");
    request.onreadystatechange = function () {
      //request.readyState == 4 means operation is done
      if (request.readyState == 4) {
        processObject(JSON.parse(request.responseText));
      }
    };
    request.send();
  }

  function processObject(objData) {

    objVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(objData.vertexPositions),
      gl.STATIC_DRAW
    );
    objVertexPositionBuffer.itemSize = 3;
    objVertexPositionBuffer.numItems = objData.vertexPositions.length / 3;
  
    objNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objNormalBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(objData.vertexNormals),
      gl.STATIC_DRAW
    );
    objNormalBuffer.itemSize = 3;
    objNormalBuffer.numItems = objData.vertexNormals.length / 3;
  
    objTextCBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objTextCBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(objData.vertexTextureCoords),
      gl.STATIC_DRAW
    );
    objTextCBuffer.itemSize = 2;
    objTextCBuffer.numItems = objData.vertexTextureCoords.length / 2;
  
    objIndBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objIndBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(objData.indices),
      gl.STATIC_DRAW
    );
    objIndBuffer.itemSize = 1;
    objIndBuffer.numItems = objData.indices.length;
  }
  
  function drawObject(color) {
    gl.uniform1i(uEnvTexLoc,1);
    gl.uniform1i(uPhongLoc,0);
    gl.uniform1i(uSelfTexLoc,0);
    gl.uniform1i(uRefLoc,1);

    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
    gl.vertexAttribPointer(
      aPositionLocation,
      objVertexPositionBuffer.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
  
    gl.bindBuffer(gl.ARRAY_BUFFER, objNormalBuffer);
    if(aNormalLocation != -1)
    gl.vertexAttribPointer(
      aNormalLocation,
      objNormalBuffer.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
  
    gl.bindBuffer(gl.ARRAY_BUFFER, objTextCBuffer);
    gl.vertexAttribPointer(
      aTextCLocation,
      objTextCBuffer.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
  
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objIndBuffer);
  
    gl.uniform4fv(uColorLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  
    gl.drawElements(
      gl.TRIANGLES,
      objIndBuffer.numItems,
      gl.UNSIGNED_INT,
      0
    );
  }

function initSquareBuffer() {
    // buffer for point locations
    const sqVertices = new Float32Array([
      0.5, 0.5, 0, -0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 3;
    sqVertexPositionBuffer.numItems = 4;

    const sqNormals = new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ]);
    sqVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqNormals, gl.STATIC_DRAW);
    sqVertexNormalBuffer.itemSize = 3;
    sqVertexNormalBuffer.numItems = 4;
  
    // buffer for point indices
    const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;

    // buffer for point indices
    const sqTextC = new Float32Array([0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0]);
    sqTextCBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqTextCBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqTextC, gl.STATIC_DRAW);
    sqTextCBuffer.itemSize = 2;
    sqTextCBuffer.numItems = 4;
}
  
function drawSquare(color) {

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

gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexNormalBuffer);
gl.vertexAttribPointer(
    aNormalLocation,
    sqVertexNormalBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
);

// buffer for point locations
gl.bindBuffer(gl.ARRAY_BUFFER, sqTextCBuffer);
gl.vertexAttribPointer(
    aTextCLocation,
    sqTextCBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
);
    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

    gl.uniform4fv(uColorLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    
    // now draw the square
    gl.drawElements(
        gl.TRIANGLES,
        sqVertexIndexBuffer.numItems,
        gl.UNSIGNED_SHORT,
        0
    );
}

function initTextures(textureFile) {
  var tex = gl.createTexture();
  tex.image = new Image();
  tex.image.src = textureFile;
  tex.image.onload = function () {
    handleTextureLoaded(tex);
  };
  return tex;
}

function handleTextureLoaded(texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
//   gl.pixelStorei(gl.UNPACK_FLIP_Z_WEBGL, 1); // use it to flip Y if needed
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(
    gl.TEXTURE_2D, // 2D texture
    0, // mipmap level
    gl.RGB, // internal format
    gl.RGB, // format
    gl.UNSIGNED_BYTE, // type of data
    texture.image // array or <img>
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );

  drawScene();
}

function initCubeMap() {
    const faceImages = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: posx_file,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: negx_file,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: negy_file,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: posy_file,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: posz_file,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: negz_file,
        }
    ];
        var cubemapTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
      
        faceImages.forEach((face) => {
          const { target, url } = face;
      
          const level = 0;
          const internalFormat = gl.RGBA;
          const width = 512;
          const height = 512;
          const format = gl.RGBA;
          const type = gl.UNSIGNED_BYTE;
      
          gl.texImage2D(target, level, internalFormat,
                        width, height, 0, format, type, null);
      
          const image = new Image();
          image.src = url;
          image.addEventListener("load", function () {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
            gl.texImage2D(target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
          });
        });
      
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(
          gl.TEXTURE_CUBE_MAP,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR
        );
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.REPEAT); // set the texture to repreat for values of (s,t) outside of [0,1]
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.REPEAT);
        return cubemapTexture;
}

function drawCubeFrmSq(tex,color,flags){

    drawFace(tex,0,[0,0,1],color,flags);
    drawFace(tex,180,[0,1,0],color,flags);

    drawFace(tex,90,[0,1,0],color,flags);
    drawFace(tex,-90,[0,1,0],color,flags);

    drawFace(tex,90,[1,0,0],color,flags);
    drawFace(tex,-90,[1,0,0],color,flags);
}

function drawFace(tex, ang, axis, color,flags){
    gl.uniform1i(uEnvTexLoc,flags[0]);
    gl.uniform1i(uPhongLoc,flags[1]);
    gl.uniform1i(uSelfTexLoc,flags[2]);
    gl.uniform1i(uRefLoc,flags[3]);

    // Back side of the cube
    pushMatrix(matrixStack, mMatrix);
    
    // texture setup for use
    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, tex); // bind the texture object 
    gl.uniform1i(uImageTLoc, 1); // pass the texture unit
    
    // transformations
    mMatrix = mat4.rotate(mMatrix, degToRad(ang), axis)
    mMatrix = mat4.translate(mMatrix, [0,0,-1]);
    // mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [2, 2, 2]);
    
    drawSquare(color);
    
    mMatrix = popMatrix(matrixStack);
}

function makeSky(tex, ang, axis){
    gl.uniform1i(uEnvTexLoc,0);
    gl.uniform1i(uPhongLoc,0);
    gl.uniform1i(uSelfTexLoc,1);

    // Back side of the cube
    pushMatrix(matrixStack, mMatrix);
    
    // texture setup for use
    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, tex); // bind the texture object 
    gl.uniform1i(uImageTLoc, 1); // pass the texture unit
    
    // transformations
    mMatrix = mat4.rotate(mMatrix, degToRad(ang), axis)
    mMatrix = mat4.translate(mMatrix, [0,0,-100]);
    // mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [200, 200, 200]);
    
    color = [0.0, 1.0, 1.0, 1.0];
    drawSquare(color);
    
    mMatrix = popMatrix(matrixStack);
}

function drawRubi(){
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.15, 0.15, 0.15]);
  mMatrix = mat4.translate(mMatrix, [1,1.2,7]);
  mMatrix = mat4.rotate(mMatrix, degToRad(55), [0, 1, 0]);
  drawCubeFrmSq(rubi, [0,0,0,0], [0,0,1,0]);
  mMatrix = popMatrix(matrixStack);
}

function drawTable(){
    gl.uniform1i(uEnvTexLoc,1);
    gl.uniform1i(uPhongLoc,1);
    gl.uniform1i(uSelfTexLoc,1);
    gl.uniform1i(uRefLoc,1);

    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, table); // bind the texture object 
    gl.uniform1i(uImageTLoc, 1);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.scale(mMatrix, [1.5, 0.05, 1.5]);
    drawSphere([0.0,0.0,0.0,0.0]);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.scale(mMatrix, [0.1, 1.1, 0.1]);
    mMatrix = mat4.translate(mMatrix, [6.5,-1,6.5]);
    drawCubeFrmSq(table, [0,0,0,0], [1,1,1,1]);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.scale(mMatrix, [0.1, 1.1, 0.1]);
    mMatrix = mat4.translate(mMatrix, [-6.5,-1,-6.5]);
    drawCubeFrmSq(table, [0,0,0,0], [1,1,1,1]);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.scale(mMatrix, [0.1, 1.1, 0.1]);
    mMatrix = mat4.translate(mMatrix, [6.5,-1,-6.5]);
    drawCubeFrmSq(table, [0,0,0,0], [1,1,1,1]);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.scale(mMatrix, [0.1, 1.1, 0.1]);
    mMatrix = mat4.translate(mMatrix, [-6.5,-1,6.5]);
    drawCubeFrmSq(table, [0,0,0,0], [1,1,1,1]);
    mMatrix = popMatrix(matrixStack);
    
}

function drawSlab(flags){
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.3, 0.2]);
  mMatrix = mat4.translate(mMatrix, [-5,1,2.5]);
  drawCubeFrmSq(table, [0,0,0,0], [flags[0],flags[1],flags[2],flags[3]]);
  mMatrix = popMatrix(matrixStack)
  
}

function drawSkyBox(){    
    // Front side of the cube
    makeSky(posz,0,[0,0,1]);
    makeSky(negz,180,[0,1,0]);

    makeSky(posx,90,[0,1,0]);
    makeSky(negx,-90,[0,1,0]);

    makeSky(posy,90,[1,0,0]);
    makeSky(negy,-90,[1,0,0]);
}

function drawsp(){
  gl.uniform1i(uEnvTexLoc,1);
  gl.uniform1i(uPhongLoc,1);
  gl.uniform1i(uSelfTexLoc,0);
  gl.uniform1i(uRefLoc,1);


  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.22, 0.22, 0.22]);
  mMatrix = mat4.translate(mMatrix, [-2,1,4.5]);
  drawSphere([5/255,55/255,18/255,0.0]);
  mMatrix = popMatrix(matrixStack)

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.18, 0.18, 0.18]);
  mMatrix = mat4.translate(mMatrix, [4,1,2.5]);
  drawSphere([75/255,0/255,130/255,0.0]);
  mMatrix = popMatrix(matrixStack)
}

//////////////////////////////////////////////////////////////////////
//Main drawing routine
function drawScene() {
    
    if (animation) {
        window.cancelAnimationFrame(animation);
    }

    var animate = function () {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        gl.clearColor(216/255, 241/255, 217/255, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        setuniform(fragshaderProgram);
        // set up the view matrix, multiply into the modelview matrix
        mat4.identity(vMatrix);
        vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);
    
        //set up perspective projection matrix
        mat4.identity(pMatrix);
        pMatrix = mat4.perspective(45, 1.0, 0.1, 1000, pMatrix);
    
        //set up the model matrix
        mat4.identity(mMatrix);
        mat4.rotate(mMatrix, degToRad(zAngle), [0, 1, 0]);
        mat4.rotate(mMatrix, degToRad(yAngle), [1, 0, 0]);
    
        drawSkyBox();
        drawRubi();
        drawTable();
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.06, 0.06, 0.06]);
        mMatrix = mat4.translate(mMatrix, [0,8.5,0]);
        drawObject([0,0,0,1]);
        mMatrix = popMatrix(matrixStack)
        drawSlab([1,0,0,0]);
        drawsp();

        if (eyeStep !=0){
          eyePos[0] = 3*Math.sin(eyeAng);
          eyePos[2] = 3*Math.cos(eyeAng);
          eyeAng -= eyeStep;
        }
        
        animation = window.requestAnimationFrame(animate);
    }
    animate();
  }
  
  function onMouseDown(event) {
    canvas.addEventListener("mousemove", onMouseMove, false);
    canvas.addEventListener("mouseup", onMouseUp, false);
    canvas.addEventListener("mouseout", onMouseOut, false);
  
      prevMouseX = event.clientX;
      prevMouseY = canvas.height - event.clientY;
      eyeStep = 0;
    
  }
  
  function onMouseMove(event) {
    // make mouse interaction only within canvas
      var mouseX = event.clientX;
      var diffX = mouseX - prevMouseX;
      zAngle = zAngle + diffX / 5;
      prevMouseX = mouseX;
  
      var mouseY = canvas.height - event.clientY;
      var diffY = mouseY - prevMouseY;
      yAngle = yAngle - diffY / 5;
      prevMouseY = mouseY;
  
      // drawScene();
    
  }
  
  function onMouseUp(event) {
    canvas.removeEventListener("mousemove", onMouseMove, false);
    canvas.removeEventListener("mouseup", onMouseUp, false);
    canvas.removeEventListener("mouseout", onMouseOut, false);
  }
  
  function onMouseOut(event) {
    canvas.removeEventListener("mousemove", onMouseMove, false);
    canvas.removeEventListener("mouseup", onMouseUp, false);
    canvas.removeEventListener("mouseout", onMouseOut, false);
  }
  
function setuniform(shaderProgram){
    gl.useProgram(shaderProgram);
    gl.enable(gl.DEPTH_TEST);
    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
    aTextCLocation = gl.getAttribLocation(shaderProgram, "aTextC");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
    uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
    uLightPosLoc = gl.getUniformLocation(shaderProgram,"lightpos");
    uImageTLoc = gl.getUniformLocation(shaderProgram,"imageT");
    uEyePosLoc = gl.getUniformLocation(shaderProgram,"eyePos");
    uRefLoc = gl.getUniformLocation(shaderProgram,"ref");
    uCubeMapLoc = gl.getUniformLocation(shaderProgram,"cubeMap");
    uEnvTexLoc = gl.getUniformLocation(shaderProgram,"EnvTex");
    uPhongLoc = gl.getUniformLocation(shaderProgram,"Phong");
    uSelfTexLoc = gl.getUniformLocation(shaderProgram,"SelfTex");
    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);
    gl.enableVertexAttribArray(aTextCLocation);

    gl.uniform3fv(uLightPosLoc, lightpos);
    gl.uniform3fv(uEyePosLoc, eyePos);
    mat4.identity(mMatrix);

    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture); // bind the texture object 
    gl.uniform1i(uCubeMapLoc, 2);
}
  
  // This is the entry point from the html
  function webGLStart() {
    canvas = document.getElementById("assignment3");
    // canvas.addEventListener("mousedown", onMouseDown, false);
    
    // initialize WebGL
    initGL(canvas);
  
    // initialize shader program
    fragshaderProgram = initShaders(vscfrag, fscfrag);
  
    //initialize buffers for the cube and sphere
    initCubeBuffer();
    initSphereBuffer();
    initSquareBuffer();
    initObject();
    cubeMapTexture = initCubeMap();
    posx = initTextures(posx_file);
    posy = initTextures(posy_file);
    posz = initTextures(posz_file);
    negz = initTextures(negz_file);
    negx = initTextures(negx_file);
    negy = initTextures(negy_file);

    rubi = initTextures("texture_and_other_files/rcube.png");
    table = initTextures("texture_and_other_files/wood_texture.jpg");


    drawScene();
  }
  