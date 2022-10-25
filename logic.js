
var last_frame=0
var slide_speed=30
var time=0

let camera_button = document.querySelector("#start-camera");
let video = document.querySelector("#video");
let canvas = document.querySelector("#canvas");
var started=false;
const SobelkernelGx=[];
const SobelkernelGy=[];
const Gausiankernel3By3=[];
const haarsStages=[];
//initialize the Sobel kernel
SobelkernelGx.push([-1,0,1],[-2,0,2],[-1,0,1]);
SobelkernelGy.push([1,2,1],[0,0,0],[-1,-2,-1]);

//initialize the gausian blur kernel
Gausiankernel3By3.push([16,8,16]);
Gausiankernel3By3.push([8,4,8]);
Gausiankernel3By3.push([16,8,16]);

var gausianBlurEnabled=false;
var ditheringEnabled=true;
var grayscaleEnabled=false;
var edgeDetectionEnabled=false;
var inversionEnabled=false;
var hackerEffectEnabled=false;
var pixellatedEnabled=false;
//RGB active channels
var activeChannels=[true,true,true,true];
var ditheringBitDepth=16;
var hackerEffectIntensity=0.8;
var pixelArtOffset=8;
function getTimeStamp(){
return window.performance&&window.performance.now?
window.performance.now():new Date().getTime();
}

camera_button.addEventListener('click', async function() {
   	let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
	video.srcObject = stream;
	started=true;
});

function update(){
  time=getTimeStamp()
if((last_frame+slide_speed)<=time&&started){
    last_frame=time
    const ctx=canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image=ctx.getImageData(0,0, canvas.width, canvas.height);
    editPixels(image,ctx);
}
	
requestAnimationFrame(update)
}

// rgb to decimal var dec = r << 16 + g << 16 + b;
 function editPixels(image,ctx) {
    if(pixellatedEnabled)
   pixellateImage(image.data);
     // perfom floyd-Steinberg dithering
   if(ditheringEnabled){
    for(let col=0;col<canvas.height;col++){
     for(let row=0;row<canvas.width;row++){
	     	const index=(row*canvas.height+col)*4;
			const first=getPixel(row+1,col);
	        const second=getPixel(row-1,col+1);
	        const third=getPixel(row,col+1);
	        const fourth=getPixel(row+1,col+1);
	       
	        dither_pixel(image.data,first,
	        image.data[first]-find_closest_palette_color(image.data[index]));
			 dither_pixel(image.data,second,
	        image.data[second]-find_closest_palette_color(image.data[index]));
			 dither_pixel(image.data,third,
	        image.data[third]-find_closest_palette_color(image.data[index]));
				 dither_pixel(image.data,fourth,
	        image.data[fourth]-find_closest_palette_color(image.data[index]));
		
		
		}
		
	}
}
     
	//gray scale the image
	if(grayscaleEnabled)
   for(let row=0;row<canvas.width;row++){
		for(let col=0;col<canvas.height;col++){
	      const index=(row*canvas.height+col)*4;
	      const r=image.data[index]
	      const g=image.data[index+1]
	      const b=image.data[index+2]
	       const a=image.data[index+2]
	      // grayscale image 
	      const grayscale=(r+g+b+a)/3
	      setPixelValue(image.data,index,grayscale);
	     
		}
	}
	
	if(gausianBlurEnabled)
   calculateGausinanBlur(image.data);
   
   if(edgeDetectionEnabled)
   edgeDetection(image.data);
   
   if(inversionEnabled)
   invertColors(image.data);
   if(hackerEffectEnabled)
   hackerEffect(image.data);
  
   ctx.putImageData(image, 0, 0);
 
   
 }
  
  
  //edge detection using sobel's Algorithm
 function edgeDetection(data){
	 var largestMagnitude=1;
	  for(let col=1;col<canvas.height-1;col++){
     for(let row=1;row<canvas.width-1;row++){
		
		const index=getPixel(row,col);
		//apply Gradient XY
		const gx=applySobelGradient(data,row,col,SobelkernelGx);
		const gy=applySobelGradient(data,row,col,SobelkernelGy);
		const magnitude=Math.sqrt(gx*gx+gy*gy);
		
		if(magnitude>=largestMagnitude){
			largestMagnitude=magnitude;
		}
		setPixelValue(data,index,magnitude);   
		
	 }
	}
	
	
	 
	 for(let col=1;col<canvas.height-1;col++){
     for(let row=1;row<canvas.width-1;row++){
			const index=getPixel(row,col);
		    const normal=(data[index]/largestMagnitude)
		     if(activeChannels[0])
		     data[index]= normal*255;
		      if(activeChannels[1])
		     data[index+1]=normal*255;
		      if(activeChannels[2])
		     data[index+2]=normal*255;
		     //data[index+3]=normal*255; 
		 }
	}
	 
 } 
  
  
function invertColors(data){
  for(let col=1;col<canvas.height-1;col++){
     for(let row=1;row<canvas.width-1;row++){
		 const index=getPixel(row,col);
		    if(activeChannels[0])
			 data[index]=Math.abs(data[index]-255);
			  if(activeChannels[1])
			 data[index+1]=Math.abs(data[index+1]-255);
			  if(activeChannels[2])
			 data[index+2]=Math.abs(data[index+2]-255); 	 
		 
	}
  }
}

function hackerEffect(data){
	 for(let col=1;col<canvas.height-1;col++){
     for(let row=1;row<canvas.width-1;row++){
		 const index=getPixel(row,col);
		 const total=(data[index]+data[index+1]+data[index+2])/3;
		 const normal=(total/255.0);
		   if(normal>=hackerEffectIntensity){
			   data[index]=0;
			   data[index+1]=255;
			   data[index+2]=0;
			  
		   }else{
			   data[index]=0;
			   data[index+1]=0;
			   data[index+2]=0;
			   data[index+3]=255;
		   }	  
	}
  }
	
}
  
function pixellateImage(data){
  for(let row=0;row<canvas.width;row+=pixelArtOffset){
	for(let col=0;col<canvas.height;col+=pixelArtOffset){
		const parentIndex=getPixel(row,col);
		const r=data[parentIndex];
		const g=data[parentIndex+1];
		const b=data[parentIndex+2];
	for(let pr=row;(pr<row+pixelArtOffset)&(pr<canvas.width);pr++){
	  for(let cr=col;(cr<col+pixelArtOffset)&(cr<canvas.height);cr++){
	     const nbrIndex=getPixel(pr,cr);
	     	data[nbrIndex]=r;
	     	data[nbrIndex+1]=g;
	     	data[nbrIndex+2]=b;	
	}	
   }
 }}
}
  
function calculateGausinanBlur(data){
	  const output=[];
	   for(let row=1;row<canvas.width-1;row++){
	for(let col=1;col<canvas.height-1;col++){
		const index=getPixel(row,col);
		 applyGausianBlur(data,row,col,output);
		    if(activeChannels[0])
		    data[index]= output[0];
		     if(activeChannels[1])
		    data[index+1]=output[1];
		     if(activeChannels[2])
		    data[index+2]=output[2];
		     if(activeChannels[3])
		    data[index+3]=output[3];
		    output.splice(0,output.length);
	   }
		
	}
	  
  }
 
 
 //apply gausion blur
 function applyGausianBlur(data,row,col,output){
	 //center
	const center_value1R=1/Gausiankernel3By3[1][1]*data[getPixel(row,col)];
	const center_value1G=1/Gausiankernel3By3[1][1]*data[getPixel(row,col)+1];
	const center_value1B=1/Gausiankernel3By3[1][1]*data[getPixel(row,col)+2];
	const center_value1A=1/Gausiankernel3By3[1][1]*data[getPixel(row,col)+3];
	
	const center_value2R=1/Gausiankernel3By3[0][1]*data[getPixel(row-1,col)];
	const center_value2G=1/Gausiankernel3By3[0][1]*data[getPixel(row-1,col)+1];
	const center_value2B=1/Gausiankernel3By3[0][1]*data[getPixel(row-1,col)+2];
	const center_value2A=1/Gausiankernel3By3[0][1]*data[getPixel(row-1,col)+3];
	
	const center_value3R=1/Gausiankernel3By3[2][1]*data[getPixel(row+1,col)]; 
	const center_value3G=1/Gausiankernel3By3[2][1]*data[getPixel(row+1,col)+1]; 
	const center_value3B=1/Gausiankernel3By3[2][1]*data[getPixel(row+1,col)+2]; 
	const center_value3A=1/Gausiankernel3By3[2][1]*data[getPixel(row+1,col)+3]; 

	  //top
	const top_value1R=1/Gausiankernel3By3[0][0]*data[getPixel(row-1,col-1)];
	const top_value1G=1/Gausiankernel3By3[0][0]*data[getPixel(row-1,col-1)+1];
	const top_value1B=1/Gausiankernel3By3[0][0]*data[getPixel(row-1,col-1)+2];
	const top_value1A=1/Gausiankernel3By3[0][0]*data[getPixel(row-1,col-1)+3];

	const top_value2R=1/Gausiankernel3By3[1][0]*data[getPixel(row,col-1)];
	const top_value2G=1/Gausiankernel3By3[1][0]*data[getPixel(row,col-1)+1];
	const top_value2B=1/Gausiankernel3By3[1][0]*data[getPixel(row,col-1)+2];
	const top_value2A=1/Gausiankernel3By3[1][0]*data[getPixel(row,col-1)+3];
	
	const top_value3R=1/Gausiankernel3By3[2][0]*data[getPixel(row+1,col-1)];
	const top_value3G=1/Gausiankernel3By3[2][0]*data[getPixel(row+1,col-1)+1];
	const top_value3B=1/Gausiankernel3By3[2][0]*data[getPixel(row+1,col-1)+2];
	const top_value3A=1/Gausiankernel3By3[2][0]*data[getPixel(row+1,col-1)+3];
	
	 //bottom
	const bottom_value1R=1/Gausiankernel3By3[0][2]*data[getPixel(row-1,col+1)];
	const bottom_value1G=1/Gausiankernel3By3[0][2]*data[getPixel(row-1,col+1)+1];
	const bottom_value1B=1/Gausiankernel3By3[0][2]*data[getPixel(row-1,col+1)+2];
	const bottom_value1A=1/Gausiankernel3By3[0][2]*data[getPixel(row-1,col+1)+3];
	
	const bottom_value2R=1/Gausiankernel3By3[1][2]*data[getPixel(row,col+1)];
	const bottom_value2G=1/Gausiankernel3By3[1][2]*data[getPixel(row,col+1)+1];
	const bottom_value2B=1/Gausiankernel3By3[1][2]*data[getPixel(row,col+1)+2];
	const bottom_value2A=1/Gausiankernel3By3[1][2]*data[getPixel(row,col+1)+3];
	
	const bottom_value3R=1/Gausiankernel3By3[2][2]*data[getPixel(row+1,col+1)];
	const bottom_value3G=1/Gausiankernel3By3[2][2]*data[getPixel(row+1,col+1)+1];
	const bottom_value3B=1/Gausiankernel3By3[2][2]*data[getPixel(row+1,col+1)+2];
	const bottom_value3A=1/Gausiankernel3By3[2][2]*data[getPixel(row+1,col+1)+3];
	
	const R=center_value1R+center_value2R+center_value3R
	+top_value1R+top_value2R+top_value3R+bottom_value1R+bottom_value2R+bottom_value3R;
	const G=center_value1G+center_value2G+center_value3G
	+top_value1G+top_value2G+top_value3G+bottom_value1G+bottom_value2G+bottom_value3G;
	const B=center_value1B+center_value2B+center_value3B
	+top_value1B+top_value2B+top_value3B+bottom_value1B+bottom_value2B+bottom_value3B;
	const A=center_value1A+center_value2A+center_value3A
	+top_value1A+top_value2A+top_value3A+bottom_value1A+bottom_value2A+bottom_value3A;
	
	output.push(R);
	output.push(G);
	output.push(B);
	output.push(A);
	
	 return output;
 }
 
 //apply Sobel Gradient
 function applySobelGradient(data,row,col,kernel){
		//center
		const center_value2=kernel[0][1]*data[getPixel(row-1,col)];
		const center_value1=kernel[1][1]*data[getPixel(row,col)];
		const center_value3=kernel[2][1]*data[getPixel(row+1,col)];
		//top
		const top_value1=kernel[0][0]*data[getPixel(row-1,col-1)];
		const top_value2=kernel[1][0]*data[getPixel(row,col-1)];
		const top_value3=kernel[2][0]*data[getPixel(row+1,col-1)];
		//bottom
		const bottom_value1=kernel[0][2]*data[getPixel(row-1,col+1)];
		const bottom_value2=kernel[1][2]*data[getPixel(row,col+1)];
		const bottom_value3=kernel[2][2]*data[getPixel(row+1,col+1)];
		
		const total=center_value1+center_value2+center_value3
		+top_value1+top_value2+top_value3+
		bottom_value1+bottom_value2+bottom_value3;
		return total;
 }
  
  
 function initializeHaarKernel(sizeRow,sizeCol){
	 //first vertical a 2x2 kernel
	 var v2=[];
	 for(let row=0;row<sizeRow;row++){
		   cArray=[];
	  for(let col=0;col<sizeCol;col++){
	       cArray.push(0);
	 }
	  v2.push(cArray);
	 
 }
     haarsStages.push(v2);
}  


function HaarFacialRecognition(data){
	
	const testData=[[0.4,0.7,0.9,0.7,0.4,0.5,1.0,0.3],
	                [0.3,1.0,0.5,0.8,0.7,0.4,0.1,0.4],
	                [0.9,0.4,0.1,0.2,0.5,0.8,0.2,0.9],
	                [0.3,0.6,0.8,1.0,0.3,0.7,0.5,0.3],
	                [0.2,0.9,0.1,0.5,0.1,0.4,0.8,0.8],
	                [0.5,0.1,0.3,0.7,0.9,0.6,1.0,0.2],
	                [0.8,0.4,1.0,0.2,0.7,0.3,0.1,0.4],
	                [0.4,0.9,0.6,0.6,0.2,1.0,0.5,0.9]];
   const testOutput=[];	 
              
	//create an integral image to reduce computation
	for(let i=0;i<testData.length;i++){
		var column=[];
		for(let j=0;j<testData[i].length;j++){
			 var value=0;
			  for(it=i;it>=0;it--){
				  for(jt=j;jt>=0;jt--)
				   value+=testData[it][jt];
			 }
			
			column.push(value);
		}
		
		testOutput.push(column);
	}
	
	
	 const vkernel=haarsStages[0];
	
  for(let i=1;i<testOutput.length-vkernel.length;i++){ 
	  for(let j=1;j<testOutput[i].length-vkernel[0].length;j+=vkernel[0].length){
		  //top Left pixel weight
		  const first=calculateHaar(testOutput,vkernel,i,j);
		  const second=calculateHaar(testOutput,vkernel,i,j+vkernel[0].length/2);
		  console.log(first[0]+"  "+first[1]);
		  console.log(first[2]+" "+first[3]);
		   console.log(second[0]+"  "+second[1]);
		  console.log(second[2]+" "+second[3]);
	  }
  }
	
}


function calculateHaar(integral,vkernel,i,j){
	  var TopLeft= integral[i-1][j-1];
	  var TopRight=integral[i-1][j+vkernel[0].length/2-1];
	  var BottomLeft=integral[i+vkernel.length-1][j-1];
	  var BottomRight=integral[i+vkernel.length-1][j+vkernel[0].length/2-1];
		  
	return [TopLeft,TopRight,BottomLeft,BottomRight];
}

function printHaarKernels(){
	
	
	for(let k=0;k<haarsStages.length;k++){
		const stage=haarsStages[k];
		var strOut=""
	   for(let i=0;i<stage.length;i++){
		   for(let j=0;j<stage[i].length;j++){
			   
			   strOut+=stage[i][j];
		   }
		   strOut+="\n";
		   
	   }	
		console.log(strOut);
		console.log(" ");
	}
	
	
	
}
  function dither_pixel(data,index,quant_error){
	  if(activeChannels[0])
	 data[index]=data[index]+quant_error*7/ditheringBitDepth;
	  if(activeChannels[1])
	 data[index+1]=data[index+1]+quant_error*3/ditheringBitDepth;
	  if(activeChannels[2])
	 data[index+2]=data[index+2]+quant_error*5/ditheringBitDepth;
	 data[index+3]=data[index+3]+quant_error*1/ditheringBitDepth;  
  }
  
  function getPixel(row,col){
	   return(col*canvas.width+row)*4; 
  }
  
  function setPixelValue(data,index,value){
	   if(activeChannels[0])
	  data[index]=value;
	   if(activeChannels[1])
	  data[index+1]=value;
	   if(activeChannels[2])
	  data[index+2]=value;
	  data[index+3]=value;
	 
  }
  
   function find_closest_palette_color(oldpixel){
	    return Math.round(oldpixel/255);  
   }
   
   
   
   
   function toggleBitDepth(selectObject){
	   var opt=selectObject.options[selectObject.selectedIndex];
	     
	     switch(opt.text){
			 
			case "4Bit":
			 ditheringBitDepth=4;
			 break;
			case "8Bit":
			ditheringBitDepth=8;
			 break;
			case "16Bit":
			ditheringBitDepth=16;
			 break;
			case "32Bit":
			ditheringBitDepth=32;
			 break;
			case "64Bit":
			ditheringBitDepth=64;
			 break;
			 
		 }
   }
   
   function togglePixelSize(selectObject){
	    var opt=selectObject.options[selectObject.selectedIndex];
	     switch(opt.text){
			case "2px":
			pixelArtOffset=2;
			break;
			case "4px":
			pixelArtOffset=4;
			break;
			case "6px":
			pixelArtOffset=6;
			break;
			case "8px":
			pixelArtOffset=8;
			break;
			case "12px":
			pixelArtOffset=12;
			break;
			case "16px":
			pixelArtOffset=16;
			break;
			case "32px":
			pixelArtOffset=32;
			break; 
			
		 }
   }
   
   function toggleDithering(){
	   ditheringEnabled=!ditheringEnabled;
	  document.getElementById("ditheringBox").checked=ditheringEnabled;
	   
   }
   
   function toggleGrayscale(){
	  grayscaleEnabled=!grayscaleEnabled;
	  document.getElementById("grayscaleBox").checked=grayscaleEnabled;
	
   }
   
   function toggleGausianBlur(){
	  gausianBlurEnabled=!gausianBlurEnabled;
	  document.getElementById("gausionBox").checked=gausianBlurEnabled;
	 
   }
   
   function toggleInversion(){
	  inversionEnabled=!inversionEnabled;
	  document.getElementById("inversionBox").checked=inversionEnabled;
	 
   }
   
   function toggleEdgeDetection(){
	  edgeDetectionEnabled=!edgeDetectionEnabled;
	  document.getElementById("edgeDetectionBox").checked=edgeDetectionEnabled;
	   
   }
   
   
   function toggleRedChannel(){
	   activeChannels[0]=!activeChannels[0];
	   activeChannels[0]=activeChannels[0];
	   document.getElementById("red").checked=activeChannels[0];
	
   }
   
   function toggleGreenChannel(){
	    activeChannels[1]=!activeChannels[1];
	    activeChannels[1]=activeChannels[1];
	    document.getElementById("green").checked=activeChannels[1];
	
   }
   
   function toggleBlueChannel(){
	    activeChannels[2]=!activeChannels[2];
	    activeChannels[2]=activeChannels[2];
	    document.getElementById("blue").checked=activeChannels[2];
	
   }
   
   function toggleHackerEffect(){
	   hackerEffectEnabled=!hackerEffectEnabled;
	  document.getElementById("hackerBox").checked=hackerEffectEnabled;
   }
   
   function togglePixelEffect(){
	  pixellatedEnabled=!pixellatedEnabled;
	  document.getElementById("pixelBox").checked=pixellatedEnabled;
 
	   
   }
   
   function hackerEffectIntensityChanged(slider){
	   hackerEffectIntensity=slider.value/100;
   }
update()
initializeHaarKernel(6,6);
initializeHaarKernel(6,6);
HaarFacialRecognition(null);
