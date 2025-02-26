const BaseWidget = require('./BaseWidget.js');
const markdownRenderer = require('./framework/markdownRenderer.js');
const termutils = require('./framework/termutils.js');
const sliceAnsi = require('slice-ansi');
const chalk = require('chalk');

class TextWidget extends BaseWidget {

	constructor() {
		super();
		this.markdownRendering_ = true;
		this.text_ = '';
		this.scrollTop_ = 0;
		this.scrollableHeight_ = 0;
		this.updateDisplayedText_ = false;
		this.renderedText_ = '';
		this.stickToBottom_ = false;
		this.markdownRendererOptions_ = {};
	}

	get widgetType() {
		return 'text';
	}

	get canHaveFocus() {
		return true;
	}

	get text() {
		return this.text_;
	}

	set text(v) {
		if (this.text_ === v) return;
		this.text_ = v;
		this.updateDisplayedText_ = true;
		this.invalidate();
	}

	get stickToBottom() {
		return this.stickToBottom_;
	}

	get markdownRendererOptions() {
		return this.markdownRendererOptions_;
	}

	set markdownRendererOptions(v) {
		if (this.markdownRendererOptions_ === v) return;
		this.markdownRendererOptions_ = v;
		this.updateDisplayedText_ = true;
		this.invalidate();
	}

	set stickToBottom(v) {
		this.stickToBottom_ = v;
		this.invalidate();
	}

	get markdownRendering() {
		return this.markdownRendering_;
	}

	set markdownRendering(v) {
		this.markdownRendering_ = v;
		this.invalidate();
	}

	get maxScrollTop_() {
		if (!this.scrollableHeight_) return 0;
		if (!this.innerHeight) return 0;
		return Math.max(this.scrollableHeight_ - this.innerHeight, 0);
	}

	boundScrollTop_() {
		let max = this.maxScrollTop_;
		if (this.scrollTop_ >= max) this.scrollTop_ = max;
		if (this.scrollTop_ < 0) this.scrollTop_ = 0;
	}

	get scrollTop() {
		return this.scrollTop_;
	}

	set scrollTop(v) {
		if (this.scrollTop_ === v) return;
		this.scrollTop_ = v;
		this.boundScrollTop_();
		this.invalidate();
	}

	scrollUp() {
		this.scrollTop = this.scrollTop - 1;
	}

	scrollDown() {
		this.scrollTop = this.scrollTop + 1;
	}

	scrollBottom() {
		this.scrollTop = this.scrollableHeight_;
	}

	pageUp() {
		this.scrollTop -= this.innerHeight;
	}

	pageDown() {
		this.scrollTop += this.innerHeight;
	}

	scrollXUp(x) {
		this.scrollTop -= x;
	}

	scrollXDown(x) {
		this.scrollTop += x;
	}


	onKey(name, matches, data) {
		super.onKey(name, matches, data);

		if (name === 'UP') {
			this.scrollUp();
		} else if (name === 'DOWN') {
			this.scrollDown();
		} else if (name === 'PAGE_UP') {
			this.pageUp();
		} else if (name === 'PAGE_DOWN') {
			this.pageDown();
		} else if (name == 'TOP') {
			this.scrollTop = 0;
		} else if (name == 'BOTTOM') {
			this.scrollBottom();
		} else if (name == '5_UP') {
			this.scrollXUp(5);
		} else if (name == '5_DOWN') {
			this.scrollXDown(5);
		}
	}

	onSizeChanged() {
		super.onSizeChanged();

		this.updateDisplayedText_ = true;
		this.invalidate();
	}

	render() {
		super.render();

		const term = this.term;

		term.saveCursor();

		this.innerClear();

		let x = this.absoluteInnerX;
		let y = this.absoluteInnerY;
		const innerWidth = this.innerWidth;

		let textToDisplay = this.text;

		// 'innerWidth - 1' because buggy Windows terminal doesn't handle unicode
		//  properly, and if cutting at the exact width, it will overflow the container
		const textMaxWidth = innerWidth - 1;

		if (this.markdownRendering_) {
			if (this.updateDisplayedText_) {
				const options = Object.assign({}, this.markdownRendererOptions, { width: textMaxWidth });
				this.renderedText_ = markdownRenderer(textToDisplay, options);
				this.updateDisplayedText_ = false;
			}
		} else {
			if (this.updateDisplayedText_) {
				this.renderedText_ = termutils.wrapLines(textToDisplay, textMaxWidth);
			}
		}

		textToDisplay = this.renderedText_;

		const lines = textToDisplay.split("\n");

		let showScrollBar = (lines.length > this.innerHeight);

		this.scrollableHeight_ = lines.length;
		if (this.stickToBottom_) this.scrollTop_ = this.scrollableHeight_;
		this.boundScrollTop_();

		for (let i = this.scrollTop; i < lines.length; i++) {
			const line = lines[i];

			let padRight = '';
			if (showScrollBar) padRight = ' ';
			term.moveTo(x, y);
			//term.write(sliceAnsi(' ' + line + padRight, 0, innerWidth - (1 + padRight.length)));
			term.write(sliceAnsi(' ' + line + padRight, 0, innerWidth - (1 + padRight.length)));

			if (y >= this.absoluteInnerY + this.innerHeight - 1) break;
			y++;
		}

		if (showScrollBar) {
			term.drawVLine(x + innerWidth - 1, this.y, this.innerHeight, chalk.bgAnsi256(240).ansi256(16)(' '));
			term.moveTo(x + innerWidth - 1, this.y + (((this.scrollTop) / (lines.length - this.innerHeight)) * (this.innerHeight - 1)));
			term.write(chalk.bgAnsi256(45).ansi256(255)(' '));
		}
		chalk.reset();
		term.restoreCursor();
	}

}

module.exports = TextWidget;
