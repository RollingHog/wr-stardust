# wr-stardust-visualiser
КОммит с оригинальными технологиями fe099f61342cd101b84354fb1816a71749d3902f
## Планы
* Добавить https://neolurk.org/wiki/Rarjpeg к файлам техдрев

Копирование ~~жопы~~ текста поста известной АИБ по нажатию
```js
document.querySelectorAll('.post__message').forEach(el => el.onclick = () => navigator.clipboard.writeText(el.innerText.trim()))
```