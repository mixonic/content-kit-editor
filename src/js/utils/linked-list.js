export default class LinkedList {
  constructor(options={adoptItem: () => {}, freeItem: () => {}}) {
    this.head = null;
    this.tail = null;
    this.adoptItem = options.adoptItem;
    this.freeItem = options.freeItem;
  }
  prepend(item) {
    this.adoptItem(item);

    if (this.head) {
      this.insertBefore(item, this.head);
    } else {
      this.head = item;
      this.tail = item;
      item.prev = null;
      item.next = null;
    }
  }
  append(item) {
    this.adoptItem(item);

    if (this.tail) {
      this.insertAfter(item, this.tail);
    } else {
      this.prepend(item);
    }
  }
  insertAfter(newItem, oldItem) {
    this.adoptItem(newItem);

    if (!oldItem) {
      this.append(newItem);
      return;
    }

    newItem.prev = oldItem;
    newItem.next = oldItem.next;

    if (oldItem.next) {
      oldItem.next.prev = newItem;
    } else {
      this.tail = newItem;
    }

    oldItem.next = newItem;
  }
  insertBefore(newItem, oldItem) {
    this.adoptItem(newItem);

    if (!oldItem) {
      this.prepend(newItem);
      return;
    }

    newItem.prev = oldItem.prev;
    newItem.next = oldItem;

    if (oldItem.prev) {
      oldItem.prev.next = newItem;
    } else {
      this.head = newItem;
    }

    oldItem.prev = newItem;
  }
  remove(item) {
    this.freeItem(item);

    if (item.prev) {
      item.prev.next = item.next;
    } else {
      this.head = item.next;
    }

    if (item.next) {
      item.next.prev = item.prev;
    } else {
      this.tail = item.prev;
    }

    item.prev = null;
    item.next = null;
  }
}
