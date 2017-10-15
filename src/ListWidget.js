const BaseWidget = require('./BaseWidget.js');
const stringWidth = require('string-width');
const termutils = require('./framework/termutils.js');

const chalk = require('chalk');

class ListWidget extends BaseWidget {

	constructor() {
		super();

		this.items_ = [];
		this.currentIndex_ = -1;
		this.topIndex_ = 0;
		this.itemMaxWidth_ = null;
		this.itemRenderer_ = null;
	}

	get items() {
		return this.items_;
	}

	set items(v) {
		if (this.items_ === v) return;

		this.items_ = v;
		this.itemMaxWidth_ = null;
		this.currentIndex_ = this.items_.length ? 0 : -1;
		this.invalidate();
	}

	addItem(v) {
		this.items_.push(v);
		this.invalidate();
	}

	get widgetType() {
		return 'list';
	}

	onKey(name, matches, data) {
		super.onKey(name, matches, data);

		if (name === 'UP') {
			this.selectUp();
		} else if (name === 'DOWN') {
			this.selectDown();
		} else if (name === 'PAGE_UP') {
			this.pageUp();
		} else if (name === 'PAGE_DOWN') {
			this.pageDown();
		}
	}

	onResize() {
		super.onResize();

		// Reset the top index so that the max/min value
		// is re-applied to it.
		const v = this.topIndex;
		this.topIndex_ = 0;
		this.topIndex = v;
	}

	get topIndex() {
		return this.topIndex_;
	}

	get bottomIndex() {
		return this.topIndex_ + this.innerHeight - 1;
	}

	set topIndex(v) {
		if (v > this.maxTopIndex) v = this.maxTopIndex;
		if (v < 0) v = 0;
		if (this.topIndex_ === v) return;

		this.topIndex_ = v;
		this.invalidate();
	}

	set bottomIndex(v) {
		this.topIndex = v - this.innerHeight + 1;
	}

	get maxTopIndex() {
		if (this.items_.length <= this.innerHeight) return 0;
		return this.items_.length - this.innerHeight;
	}

	selectUp() {
		this.currentIndex = this.currentIndex - 1;
	}

	selectDown() {
		this.currentIndex = this.currentIndex + 1;
	}

	pageUp() {
		this.currentIndex -= this.innerHeight;
	}

	pageDown() {
		this.currentIndex += this.innerHeight;
	}

	scrollDown() {
		this.topIndex = this.topIndex_ + 1;
	}

	scrollUp() {
		this.topIndex = this.topIndex_ - 1;
	}

	scrollBottom() {
		this.bottomIndex = this.items_.length - 1;
	}

	get currentIndex() {
		return this.currentIndex_;
	}

	set currentIndex(v) {
		if (v < 0) v = 0;
		if (v >= this.items_.length) v = this.items_.length - 1;
		if (v === this.currentIndex_) return;

		this.currentIndex_ = v;

		if (this.currentIndex_ < this.topIndex) {
			this.topIndex = this.currentIndex_;
		} else if (this.currentIndex_ > this.bottomIndex) {
			this.bottomIndex = this.currentIndex_;
		}

		this.onCurrentItemChange();
		this.invalidate();
	}

	get currentItem() {
		const i = this.currentIndex;
		return i >= 0 && i < this.items_.length ? this.items_[i] : null;
	}

	itemIndexByKey(key, value) {
		for (let i = 0; i < this.items_.length; i++) {
			const item = this.items_[i];
			if (typeof item === 'object' && item[key] === value) return i;
		}
		return -1;
	}

	onCurrentItemChange() {
		this.eventEmitter.emit('currentItemChange');
	}

	get itemRenderer() {
		return this.itemRenderer_;
	}

	set itemRenderer(callback) {
		if (callback === this.itemRenderer_) return;
		this.itemRenderer_ = callback;
		this.invalidate();
	}

	get itemMaxWidth() {
		if (this.itemMaxWidth_ !== null) return this.itemMaxWidth_;

		let output = 0;
		for (let i = 0; i < this.items_.length; i++) {
			if (this.items_[i].label.length > output) output = this.items_[i].label.length;
		}
		return output;
	}

	formatItemLabel(label, width) {
		// Currently emojis don't work properly in Windows terminals (width cannot
		// be reliably determined) so convert them to plain text. Maybe emojis could
		// be enabled depending on the terminal or operating system (it might
		// work on MacOS).
		label = termutils.toPlainText(label).trim();
		const labelWidth = stringWidth(label);
		if (labelWidth < width) {
			return label + ' '.repeat(width - labelWidth);
		} else {
			while (stringWidth(label) > width) {
				label = label.substr(0, label.length - 1);
			}
			return label;
		}
	}

	render() {
		super.render();

		const term = this.term;

		let cursorX = this.absoluteInnerX;
		let cursorY = this.absoluteInnerY;
		let itemWidth = this.innerWidth;
		let viewHeight = 0;

		this.innerClear();

		for (let i = this.topIndex; i <= this.bottomIndex; i++) {
			if (i >= this.items_.length) break;
			
			let item = this.items_[i];

			term.moveTo(cursorX, cursorY);

			let style = null;

			if (i == this.currentIndex) {
				if (this.hasKeyboard) {
					style = chalk.bgWhite.black;
				} else {
					style = chalk.bgBlackBright.black;
				}
			} else {
				chalk.reset();
			}

			const itemLabel = this.itemRenderer_ ? this.itemRenderer_(item) : item;
			if (typeof itemLabel !== 'string') throw new Error('Non-string item list label at index ' + i);
			const stringToWrite = this.formatItemLabel(itemLabel, itemWidth);
			term.write(style ? style(stringToWrite) : stringToWrite);

			cursorY++;
			viewHeight++;

			if (viewHeight > this.innerHeight) {
				break;
			}
		}

		chalk.reset();
	}

}

module.exports = ListWidget;