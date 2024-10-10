function drawBarrel(a, xoffset, yoffset, width, length, alpha, isghost, type, aspect, colour, objx, objy, angl) {
    ctx.save();
    length = Math.abs(length);
    width = Math.abs(width);
  if(objx != undefined) this.objx = objx
  if(objy != undefined) this.objy = objy
  if(angl) this.angl = angl
    if (newGraph === false) {
        ctx.strokeStyle = "rgba(85, 85, 85, " + alpha + ")";
    } else {
        ctx.strokeStyle = ColorLuminance(colour, document.getElementById("luminance").value);
    }
    ctx.lineWidth = 5;
    ctx.fillStyle = colour;
    ctx.globalAlpha = alpha;
    ctx.translate((objx != undefined ? this.objx : tankpointx), (objy != undefined ? this.objy : tankpointy),  0);
    if (editmode === false) {
        ctx.rotate(!objx && !objy ? (angle(tankpointx, tankpointy, mouse.x, mouse.y) + a) * (Math.PI / 180) : (a+this.angl) * Math.PI/180);
    } else if ((isghost === true) && (shiftheld === true)) {
        //if ((a <= -172.5) || (a >= 172.5)) {
        //a = 180;
        //}
        a -= a % (document.getElementById("increment").value);
        ctx.rotate(a * (Math.PI / 180));
    } else {
        ctx.rotate(a * (Math.PI / 180));
    }
//   if (type === 0) {
            ctx.beginPath();
			if (aspect > -1) {
				ctx.moveTo(xoffset, -(width / 2) - yoffset);
            	ctx.lineTo(xoffset + length, -(width / 2 * aspect) - yoffset);
            	ctx.lineTo(xoffset + length, (width / 2 * aspect) - yoffset);
            	ctx.lineTo(xoffset, (width / 2) - yoffset);
            	ctx.lineTo(xoffset, -(width / 2) - yoffset);
			} else {
				ctx.moveTo(xoffset, -(width / 2 * -aspect) - yoffset);
            	ctx.lineTo(xoffset + length, -(width / 2) - yoffset);
            	ctx.lineTo(xoffset + length, (width / 2) - yoffset);
            	ctx.lineTo(xoffset, (width / 2 * -aspect) - yoffset);
            	ctx.lineTo(xoffset, -(width / 2 * -aspect) - yoffset);
			}
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
/*
        } else if (type === 1) {
            ctx.beginPath();
            ctx.moveTo(xoffset + length, -(width / 2) - yoffset);
            ctx.lineTo(xoffset + length + (length / 2), 0 - ((width * 1.5) + yoffset));
            ctx.lineTo(xoffset + length + (length / 2), ((width * 1.5) - yoffset));
            ctx.lineTo(xoffset + length, (width / 2) - yoffset);
            ctx.lineTo(xoffset + length, -(width / 2) - yoffset);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillRect(xoffset, 0 - ((width / 2) + yoffset), length, width);
            ctx.strokeRect(xoffset, 0 - ((width / 2) + yoffset), length, width);
        } else if ((type === 2) || (type === 3)) {
            ctx.beginPath();
            ctx.moveTo(xoffset + 20, -(width / 4) - yoffset);
            ctx.lineTo(xoffset + 20 + (length / 2), 0 - ((width / 2) + yoffset) - (width / 4));
            ctx.lineTo(xoffset + 20 + (length / 2), ((width / 2) - yoffset) + (width / 4));
            ctx.lineTo(xoffset + 20, (width / 4) - yoffset);
            ctx.lineTo(xoffset + 20, -(width / 4) - yoffset);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (type === 4) {
            ctx.translate(xoffset + parseInt(validateField(document.getElementById("body").value, 32)), -((width / 2) + yoffset));
            if ((editmode === false) && (shapes.length > 0)) {
                ctx.rotate(((angle(tankpointx, tankpointy, mouse.x, mouse.y) + a) * -1) * (Math.PI / 180));
                ctx.rotate(angle(tankpointx + xoffset + parseFloat(validateField(document.getElementById("body").value, 32)), tankpointy - ((width / 2) + yoffset), shapes[nShape].x, shapes[nShape].y) * (Math.PI / 180));
            }
            ctx.fillRect(0, 0, length, width);
            ctx.strokeRect(0, 0, length, width);
            ctx.beginPath();
            ctx.arc(0, width / 2, width, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }*/

    ctx.restore();
}

function drawBullet(x, y, size, transparency, color) {
    //Draw a bullet using the given parameters.

    var bColor = "";

    if (color === "#ffffff") {
        bColor = document.getElementById("color").value;
    } else {
        bColor = color;
    }

    ctx.save();
    if (newGraph === false) {
        ctx.strokeStyle = "#555555";
    } else {
        ctx.strokeStyle = ColorLuminance(bColor, document.getElementById("luminance").value);
    }
    ctx.lineWidth = 5;
    ctx.fillStyle = bColor;
    ctx.globalAlpha = transparency;
    ctx.beginPath();
    ctx.arc(x, y, size + 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + width, y, x + width, y + height, r);
    this.arcTo(x + width, y + height, x, y + height, r);
    this.arcTo(x, y + height, x, y, r);
    this.arcTo(x, y, x + width, y, r);
    this.closePath();
    return this;
};

function drawPoly(x, y, size, angle, color, sides, alpha, bullet) {
    ctx.save();
	var bColor = "";
	if (bullet !== null) {	
	    var bColor = "";
    	if (color === "#ffffff") {
    	    bColor = document.getElementById("color").value;
	    } else {
        	bColor = color;
		}
	} else bColor = color;
    if (newGraph === false) {
        ctx.strokeStyle = "#555555";
    } else {
        ctx.strokeStyle = ColorLuminance(bColor, document.getElementById("luminance").value);
    }
    ctx.lineWidth = 5;
    ctx.fillStyle = bColor;
    ctx.translate(x, y);
    ctx.rotate(angle * (Math.PI / 180));
    ctx.beginPath();
    ctx.rotate((sides % 2 ? 270 : 180 / sides) * Math.PI / 180);
    for (i = 0; i < sides; i++) {
        ctx.rotate((360 / sides) * (Math.PI / 180));
        ctx.lineTo(0, size);
    }
    ctx.globalAlpha = alpha;
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawConc(x, y, size, angle, color, sides, alpha, bullet) {
    ctx.save();	
	var bColor = "";
	if (bullet !== null) {	
	    var bColor = "";
    	if (color === "#ffffff") {
    	    bColor = document.getElementById("color").value;
	    } else {
        	bColor = color;
		}
	} else bColor = color;
    if (newGraph === false) {
        ctx.strokeStyle = "#555555";
    } else {
        ctx.strokeStyle = ColorLuminance(bColor, document.getElementById("luminance").value);
    }
    ctx.lineWidth = 5;
    ctx.fillStyle = bColor;
    ctx.translate(x, y);
	ctx.rotate(angle * (Math.PI / 180));
    ctx.beginPath();
	let dip = 1 - 6 / sides / sides;
	sides = -sides;
	ctx.rotate((sides % 2 ? 0 : 180 / sides) * Math.PI / 180);
	for (let i = 0; i < sides; i++) {
		let theta = (i + 1) / sides * 2 * Math.PI,
			htheta = (i + .5) / sides * 2 * Math.PI,
		c = {
			x: size * dip * Math.cos(htheta),
			y: size * dip * Math.sin(htheta)
		},
		p = {
			x: size * Math.cos(theta),
			y: size * Math.sin(theta)
		};
		ctx.quadraticCurveTo(c.x, c.y, p.x, p.y);
	}
    ctx.globalAlpha = alpha;
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}