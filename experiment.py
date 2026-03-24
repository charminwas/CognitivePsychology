from tkinter import *
import random

#字符、RGB、长度，窗口/部件尺寸
CHARACTERS = ['红', '橙', '黄', '绿', '青',
              '蓝', '紫', '粉', '黑', '棕']
COLORS = [
    "#ff0000",   # 红色
    "#ffa500",   # 橙色
    "#ffff00",   # 黄色
    "#00ff00",   # 绿色
    "#00ffff",   # 青色
    "#0000ff",   # 蓝色
    "#800080",   # 紫色
    "#ffc0cb",   # 粉色
    "#000000",   # 黑色
    "#8b4513"    # 棕色
]
LEN = len(CHARACTERS)
WIN_WIDTH = 500
WIN_HEIGHT = 600
FONT_FAMILY = ('SimHei', 'Microsoft YaHei', 'sans-serif')

#生成函数
def generate_different():
    char_idx, color_idx = random.sample(range(0, LEN), 2)
    return [CHARACTERS[char_idx], COLORS[color_idx]]

def generate_same():
    idx = random.randint(0, LEN-1)
    return CHARACTERS[idx], COLORS[idx]

#窗口构造器
class Application(Frame):
    def __init__(self, master):
        super().__init__(master)
        self.pack(fill=BOTH, expand=True)
        self.create_widgets()

    def create_widgets(self):

        self.display_area = Label(
            self, 
            text='这里将会展示带颜色的汉字',
            font=(FONT_FAMILY, 30),
            bg='white',
            relief=SUNKEN,
            bd=2,
            anchor=CENTER
        )
        self.display_area.pack(fill=BOTH, expand=True)

        self.bt_diff = Button(
            self,
            text='不同',
            font=(FONT_FAMILY, 28),
            command=self.show_different
        )
        self.bt_diff.place(x=0, y=500, width=250, height=100)

        self.bt_same = Button(
            self,
            text='相同',
            font=(FONT_FAMILY, 28),
            command=self.show_same
        )
        self.bt_same.place(x=250, y=500, width=250, height=100)

    def show_different(self):
        char, color = generate_different()
        self.display_area.config(text=char, fg=color, font=(FONT_FAMILY, 100))

    def show_same(self):
        char, color = generate_same()
        self.display_area.config(text=char, fg=color, font=(FONT_FAMILY, 100))


if __name__ == '__main__':
    root = Tk()
    root.title('TEST')
    root.geometry(f'{WIN_WIDTH}x{WIN_HEIGHT}')
    root.resizable(False, False)
    app = Application(root)
    root.mainloop()