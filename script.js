// =====================================================
// 1. BIẾN TOÀN CỤC
// =====================================================

let dictionaryEntries = [];

let hanziIndex = new Map();
let pinyinIndex = new Map();
let pinyinToneIndex = new Map();

// Tần suất từ Jieba
let frequencyMap = new Map();

let dictionaryLoaded = false;

// Chế độ tìm kiếm mặc định
let searchMode = "pinyin";


// =====================================================
// 2. HTML ELEMENTS
// =====================================================

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const hanzi =
    document.getElementById("hanzi");

const pinyin =
    document.getElementById("pinyin");

const meaning =
    document.getElementById("meaning");

const speakButton =
    document.getElementById("speakButton");

const characterTarget =
    document.getElementById("characterTarget");

const searchResults =
    document.getElementById("searchResults");

const pinyinModeButton =
    document.getElementById("pinyinMode");

const vietnameseModeButton =
    document.getElementById("vietnameseMode");


// =====================================================
// 3. CHUẨN HÓA CHUNG
// =====================================================

function normalizeText(text) {

    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, "")
        .replace(/[-']/g, "")
        .trim();
}


// =====================================================
// 4. PINYIN CÓ THANH
// =====================================================

function normalizeTonePinyin(text) {

    return text
        .toLowerCase()
        .normalize("NFC")
        .replace(/\s+/g, "")
        .replace(/[-']/g, "")
        .trim();
}


function hasToneMark(text) {

    return /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i
        .test(text);
}


// =====================================================
// 5. TIẾNG VIỆT
// =====================================================

function normalizeVietnamese(text) {

    return text
        .toLowerCase()
        .normalize("NFC")
        .replace(
            /[.,;:!?()[\]{}"“”'‘’/\\|_-]/g,
            " "
        )
        .replace(/\s+/g, " ")
        .trim();
}


function normalizeVietnameseNoTone(text) {

    return normalizeVietnamese(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .normalize("NFC");
}


function hasVietnameseTone(text) {

    return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
        .test(text);
}


function containsWholePhrase(
    text,
    query
) {

    return (
        " " + text + " "
    ).includes(
        " " + query + " "
    );
}


// =====================================================
// 6. CHỮ HÁN
// =====================================================

function isChineseCharacter(character) {

    return /[\u3400-\u9FFF]/.test(
        character
    );
}


function containsChinese(text) {

    return /[\u3400-\u9FFF]/.test(
        text
    );
}


// =====================================================
// 7. PINYIN SỐ → PINYIN DẤU
// =====================================================

function convertSyllableToToneMark(
    syllable
) {

    const match =
        syllable.match(
            /^([A-Za-züÜvV:]+)([1-5])$/
        );


    if (!match) {
        return syllable;
    }


    let base =
        match[1];


    const tone =
        Number(
            match[2]
        );


    base = base
        .replace(/u:/g, "ü")
        .replace(/U:/g, "Ü")
        .replace(/v/g, "ü")
        .replace(/V/g, "Ü");


    if (tone === 5) {
        return base;
    }


    const marks = {

        1: "\u0304",
        2: "\u0301",
        3: "\u030C",
        4: "\u0300"

    };


    const lower =
        base.toLowerCase();


    let position =
        -1;


    if (
        lower.includes("a")
    ) {

        position =
            lower.indexOf("a");

    }

    else if (
        lower.includes("e")
    ) {

        position =
            lower.indexOf("e");

    }

    else if (
        lower.includes("ou")
    ) {

        position =
            lower.indexOf("o");

    }

    else {

        const vowels =
            "aeiouü";


        for (
            let i = base.length - 1;
            i >= 0;
            i--
        ) {

            if (
                vowels.includes(
                    lower[i]
                )
            ) {

                position = i;

                break;
            }
        }
    }


    if (
        position === -1
    ) {

        return base;
    }


    const marked =
        (
            base[position]
            +
            marks[tone]
        )
        .normalize("NFC");


    return (
        base.slice(
            0,
            position
        )
        +
        marked
        +
        base.slice(
            position + 1
        )
    );
}


function numberedPinyinToToneMarks(text) {

    return text
        .split(/\s+/)

        .map(
            convertSyllableToToneMark
        )

        .join(" ");
}


// =====================================================
// 8. INDEX HELPER
// =====================================================

function addToIndex(
    index,
    key,
    entry
) {

    if (!key) {
        return;
    }


    if (
        !index.has(key)
    ) {

        index.set(
            key,
            []
        );
    }


    index
        .get(key)
        .push(entry);
}


// =====================================================
// 9. ĐỌC CVDICT
// =====================================================

function parseCVDICT(text) {

    const entries =
        [];


    const lines =
        text.split(
            /\r?\n/
        );


    const pattern =
        /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.*)\/$/;


    for (
        const rawLine
        of lines
    ) {

        const line =
            rawLine.trim();


        if (
            line === ""
            ||
            line.startsWith("#")
        ) {

            continue;
        }


        const match =
            line.match(
                pattern
            );


        if (!match) {
            continue;
        }


        const traditional =
            match[1];


        const simplified =
            match[2];


        const pinyinNumbered =
            match[3];


        const meanings =
            match[4]

            .split("/")

            .map(
                item =>
                    item.trim()
            )

            .filter(
                Boolean
            );


        entries.push({

            traditional:
                traditional,

            simplified:
                simplified,

            pinyinNumbered:
                pinyinNumbered,

            pinyin:
                numberedPinyinToToneMarks(
                    pinyinNumbered
                ),

            meanings:
                meanings
        });
    }


    return entries;
}


// =====================================================
// 10. ĐỌC TẦN SUẤT JIEBA
//
// Format:
//
// 中国 129470 ns
// 学习 13482 v
// =====================================================

function parseFrequencyData(text) {

    frequencyMap.clear();


    const lines =
        text.split(
            /\r?\n/
        );


    for (
        const rawLine
        of lines
    ) {

        const line =
            rawLine.trim();


        if (!line) {
            continue;
        }


        const parts =
            line.split(/\s+/);


        if (
            parts.length < 2
        ) {

            continue;
        }


        const word =
            parts[0];


        const freq =
            Number(
                parts[1]
            );


        if (
            !Number.isFinite(freq)
        ) {

            continue;
        }


        // Nếu bị trùng
        // giữ tần suất lớn nhất

        const oldFreq =
            frequencyMap.get(word)
            ||
            0;


        if (
            freq > oldFreq
        ) {

            frequencyMap.set(
                word,
                freq
            );
        }
    }


    console.log(
        "Frequency entries:",
        frequencyMap.size
    );
}


// =====================================================
// 11. BUILD INDEX
// =====================================================

function buildIndexes() {

    hanziIndex.clear();

    pinyinIndex.clear();

    pinyinToneIndex.clear();


    for (
        const entry
        of dictionaryEntries
    ) {

        addToIndex(
            hanziIndex,
            entry.simplified,
            entry
        );


        addToIndex(
            hanziIndex,
            entry.traditional,
            entry
        );


        addToIndex(
            pinyinIndex,
            normalizeText(
                entry.pinyin
            ),
            entry
        );


        addToIndex(
            pinyinToneIndex,
            normalizeTonePinyin(
                entry.pinyin
            ),
            entry
        );


        entry.vietnameseMeanings =
            entry.meanings.map(
                normalizeVietnamese
            );


        entry.vietnameseMeaningsNoTone =
            entry.meanings.map(
                normalizeVietnameseNoTone
            );
    }
}


// =====================================================
// 12. TẢI DỮ LIỆU
// =====================================================

async function loadDictionary() {

    searchButton.disabled =
        true;

    searchInput.disabled =
        true;


    searchInput.placeholder =
        "Đang tải từ điển...";


    searchResults.innerHTML = `

        <div class="no-result">

            Đang tải dữ liệu...

        </div>

    `;


    try {

        const [
            dictionaryResponse,
            frequencyResponse
        ] =
            await Promise.all([

                fetch(
                    "data/CVDICT.u8"
                ),

                fetch(
                    "data/jieba_freq.txt"
                )

            ]);


        if (
            !dictionaryResponse.ok
        ) {

            throw new Error(
                "Không tải được CVDICT.u8"
            );
        }


        if (
            !frequencyResponse.ok
        ) {

            throw new Error(
                "Không tải được jieba_freq.txt"
            );
        }


        const [
            dictionaryText,
            frequencyText
        ] =
            await Promise.all([

                dictionaryResponse.text(),

                frequencyResponse.text()

            ]);


        dictionaryEntries =
            parseCVDICT(
                dictionaryText
            );


        parseFrequencyData(
            frequencyText
        );


        buildIndexes();


        dictionaryLoaded =
            true;


        console.log(
            "CVDICT entries:",
            dictionaryEntries.length
        );


        searchInput.disabled =
            false;

        searchButton.disabled =
            false;


        searchResults.innerHTML =
            "";


        updateSearchPlaceholder();


        const defaultWord =
            hanziIndex.get(
                "学习"
            );


        if (
            defaultWord
            &&
            defaultWord.length
        ) {

            displayWord(
                defaultWord[0]
            );
        }

    }

    catch(error) {

        console.error(
            error
        );


        searchResults.innerHTML = `

            <div class="no-result">

                Không tải được dữ liệu.

                <br><br>

                Kiểm tra:

                <br>

                data/CVDICT.u8

                <br>

                data/jieba_freq.txt

            </div>

        `;
    }
}


// =====================================================
// 13. LOẠI TRÙNG
// =====================================================

function removeDuplicateResults(results) {

    const seen =
        new Set();


    return results.filter(
        function(entry) {

            const key =
                entry.simplified
                +
                "|"
                +
                entry.pinyin;


            if (
                seen.has(key)
            ) {

                return false;
            }


            seen.add(key);

            return true;
        }
    );
}


// =====================================================
// 14. LẤY TẦN SUẤT
// =====================================================

function getWordFrequency(entry) {

    // Ưu tiên tần suất cả từ

    let frequency =

        frequencyMap.get(
            entry.simplified
        )

        ||

        frequencyMap.get(
            entry.traditional
        )

        ||

        0;


    if (
        frequency > 0
    ) {

        return frequency;
    }


    // Nếu từ không có trong Jieba,
    // dùng tần suất ký tự làm fallback

    let total =
        0;


    for (
        const character
        of entry.simplified
    ) {

        total +=

            frequencyMap.get(
                character
            )
            ||
            0;
    }


    // Phạt mạnh fallback
    // để từ hiếm không vượt từ có tần suất thật

    return total * 0.05;
}


// =====================================================
// 15. KIỂM TRA TỪ HIẾM / BIẾN THỂ
// =====================================================

function getRareWordPenalty(entry) {

    const text =
        entry.meanings
            .join(" ")
            .toLowerCase();


    let penalty =
        0;


    // Các mục kiểu "biến thể"
    if (
        text.includes(
            "biến thể"
        )
    ) {

        penalty +=
            900;
    }


    // Từ cổ
    if (
        text.includes(
            "cổ"
        )
    ) {

        penalty +=
            350;
    }


    // Địa phương
    if (
        text.includes(
            "địa phương"
        )
    ) {

        penalty +=
            300;
    }


    // Họ người
    if (
        text.includes(
            "họ "
        )
        ||
        text.startsWith(
            "họ"
        )
    ) {

        penalty +=
            200;
    }


    return penalty;
}


// =====================================================
// 16. TÍNH ĐIỂM PHỔ BIẾN
// =====================================================

function getFrequencyScore(entry) {

    const frequency =
        getWordFrequency(
            entry
        );


    if (
        frequency <= 0
    ) {

        return 0;
    }


    // Logarithm tránh từ siêu phổ biến
    // áp đảo tuyệt đối

    return (
        Math.log10(
            frequency + 1
        )
        *
        300
    );
}


// =====================================================
// 17. XẾP HẠNG PINYIN
// =====================================================

function rankPinyinResults(
    input,
    limit = 50
) {

    const inputHasTone =
        hasToneMark(
            input
        );


    const plainQuery =
        normalizeText(
            input
        );


    const toneQuery =
        normalizeTonePinyin(
            input
        );


    const ranked =
        [];


    for (
        const entry
        of dictionaryEntries
    ) {

        const plainPinyin =
            normalizeText(
                entry.pinyin
            );


        const tonePinyin =
            normalizeTonePinyin(
                entry.pinyin
            );


        let matched =
            false;


        let score =
            0;


        // =================================================
        // NGƯỜI DÙNG NHẬP CÓ THANH
        // =================================================

        if (
            inputHasTone
        ) {

            // Khớp hoàn toàn
            if (
                tonePinyin ===
                toneQuery
            ) {

                matched =
                    true;

                score +=
                    5000;
            }


            // Prefix
            else if (
                tonePinyin.startsWith(
                    toneQuery
                )
            ) {

                matched =
                    true;

                score +=
                    3000;
            }

        }


        // =================================================
        // KHÔNG CÓ THANH
        // =================================================

        else {

            // ni -> nǐ / ní / nī / nì
            if (
                plainPinyin ===
                plainQuery
            ) {

                matched =
                    true;

                score +=
                    4500;
            }


            // ni -> nihao / nimen...
            else if (
                plainPinyin.startsWith(
                    plainQuery
                )
            ) {

                matched =
                    true;

                score +=
                    2500;
            }
        }


        if (!matched) {
            continue;
        }


        // =================================================
        // TẦN SUẤT
        // =================================================

        score +=
            getFrequencyScore(
                entry
            );


        // =================================================
        // ƯU TIÊN TỪ NGẮN
        //
        // ni:
        // 你 thường nên cao
        // =================================================

        const hanziLength =
            [
                ...entry.simplified
            ].length;


        if (
            hanziLength === 1
        ) {

            score +=
                180;

        }

        else if (
            hanziLength === 2
        ) {

            score +=
                80;
        }


        // =================================================
        // PHẠT TỪ HIẾM
        // =================================================

        score -=
            getRareWordPenalty(
                entry
            );


        ranked.push({

            entry:
                entry,

            score:
                score

        });
    }


    // Cao -> thấp

    ranked.sort(
        function(a, b) {

            return (
                b.score
                -
                a.score
            );
        }
    );


    return removeDuplicateResults(

        ranked

            .slice(
                0,
                limit
            )

            .map(
                item =>
                    item.entry
            )

    );
}


// =====================================================
// 18. TÌM CHỮ HÁN
// =====================================================

function searchByHanzi(input) {

    return (
        hanziIndex.get(
            input
        )
        ||
        []
    );
}


// =====================================================
// 19. TÌM PINYIN
// =====================================================

function searchByPinyin(input) {

    return rankPinyinResults(
        input,
        50
    );
}


// =====================================================
// 20. TÌM TIẾNG VIỆT
// =====================================================

function searchByVietnamese(input) {

    const userTypedTone =
        hasVietnameseTone(
            input
        );


    const query =
        userTypedTone

        ?

        normalizeVietnamese(
            input
        )

        :

        normalizeVietnameseNoTone(
            input
        );


    const ranked =
        [];


    for (
        const entry
        of dictionaryEntries
    ) {

        const meanings =

            userTypedTone

            ?

            entry.vietnameseMeanings

            :

            entry.vietnameseMeaningsNoTone;


        let score =
            0;


        for (
            const item
            of meanings
        ) {

            let localScore =
                0;


            if (
                item ===
                query
            ) {

                localScore =
                    5000;
            }


            else if (
                item.startsWith(
                    query + " "
                )
            ) {

                localScore =
                    4000;
            }


            else if (
                containsWholePhrase(
                    item,
                    query
                )
            ) {

                localScore =
                    3000;
            }


            if (
                localScore >
                score
            ) {

                score =
                    localScore;
            }
        }


        if (
            score === 0
        ) {

            continue;
        }


        // Cũng dùng tần suất để
        // từ thông dụng lên trên

        score +=
            getFrequencyScore(
                entry
            );


        score -=
            getRareWordPenalty(
                entry
            );


        ranked.push({

            entry:
                entry,

            score:
                score

        });
    }


    ranked.sort(
        (a, b) =>
            b.score - a.score
    );


    return removeDuplicateResults(

        ranked.map(
            item =>
                item.entry
        )

    );
}


// =====================================================
// 21. FIND WORDS
// =====================================================

function findWords(input) {

    const value =
        input.trim();


    if (
        containsChinese(
            value
        )
    ) {

        return searchByHanzi(
            value
        );
    }


    if (
        searchMode ===
        "pinyin"
    ) {

        return searchByPinyin(
            value
        );
    }


    return searchByVietnamese(
        value
    );
}


// =====================================================
// 22. DISPLAY SEARCH RESULTS
// =====================================================

function displaySearchResults(results) {

    searchResults.innerHTML =
        "";


    if (
        results.length === 0
    ) {

        searchResults.innerHTML = `

            <div class="no-result">

                Không tìm thấy từ phù hợp.

            </div>

        `;

        return;
    }


    // Nếu tra chính xác chỉ ra 1
    if (
        results.length === 1
    ) {

        displayWord(
            results[0]
        );

        return;
    }


    results

        .slice(
            0,
            50
        )

        .forEach(
            createSearchResultItem
        );
}


// =====================================================
// 23. TẠO RESULT ITEM
// =====================================================

function createSearchResultItem(entry) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "search-result-item";


    const meaningText =
        entry.meanings
            .slice(
                0,
                3
            )
            .join("; ");


    item.innerHTML = `

        <div class="result-hanzi">

            ${entry.simplified}

        </div>


        <div class="result-info">

            <div class="result-pinyin">

                ${entry.pinyin}

            </div>


            <div class="result-meaning">

                ${meaningText}

            </div>


            ${
                entry.traditional
                !==
                entry.simplified

                ?

                `
                <div
                    style="
                        font-size:13px;
                        color:#888;
                        margin-top:4px;
                    "
                >

                    Phồn thể:
                    ${entry.traditional}

                </div>
                `

                :

                ""
            }

        </div>

    `;


    item.addEventListener(
        "click",
        function() {

            searchInput.value =
                entry.simplified;


            displayWord(
                entry
            );
        }
    );


    searchResults.appendChild(
        item
    );
}


// =====================================================
// 24. DISPLAY WORD
// =====================================================

function displayWord(entry) {

    hanzi.innerText =
        entry.simplified;


    pinyin.innerText =
        entry.pinyin;


    let meaningText =
        entry.meanings.join(
            "; "
        );


    if (
        entry.traditional
        !==
        entry.simplified
    ) {

        meaningText +=

            "\n\nPhồn thể: "
            +
            entry.traditional;
    }


    meaning.innerText =
        meaningText;


    renderCharacters(
        entry.simplified
    );


    searchResults.innerHTML =
        "";
}


// =====================================================
// 25. SEARCH BUTTON
// =====================================================

function searchWord() {

    if (
        !dictionaryLoaded
    ) {

        return;
    }


    const input =
        searchInput.value.trim();


    if (!input) {
        return;
    }


    displaySearchResults(

        findWords(
            input
        )

    );
}


// =====================================================
// 26. GỢI Ý KHI GÕ
// =====================================================

let typingTimer;


searchInput.addEventListener(
    "input",
    function() {

        clearTimeout(
            typingTimer
        );


        const input =
            searchInput.value.trim();


        if (!input) {

            searchResults.innerHTML =
                "";

            return;
        }


        typingTimer =
            setTimeout(
                function() {

                    showSuggestions(
                        input
                    );

                },
                250
            );
    }
);


// =====================================================
// 27. SHOW SUGGESTIONS
// =====================================================

function showSuggestions(input) {

    if (
        !dictionaryLoaded
    ) {

        return;
    }


    // Chữ Hán
    if (
        containsChinese(
            input
        )
    ) {

        const results =
            [];


        for (
            const entry
            of dictionaryEntries
        ) {

            if (
                entry.simplified
                    .startsWith(input)

                ||

                entry.traditional
                    .startsWith(input)
            ) {

                results.push(
                    entry
                );
            }


            if (
                results.length >=
                15
            ) {

                break;
            }
        }


        displaySuggestions(
            results
        );


        return;
    }


    // Pinyin
    if (
        searchMode ===
        "pinyin"
    ) {

        displaySuggestions(

            rankPinyinResults(
                input,
                15
            )

        );


        return;
    }


    // Tiếng Việt
    displaySuggestions(

        searchByVietnamese(
            input
        )
        .slice(
            0,
            15
        )

    );
}


// =====================================================
// 28. DISPLAY SUGGESTIONS
// =====================================================

function displaySuggestions(results) {

    searchResults.innerHTML =
        "";


    results

        .slice(
            0,
            15
        )

        .forEach(
            createSearchResultItem
        );
}


// =====================================================
// 29. CHUYỂN MODE
// =====================================================

function setSearchMode(mode) {

    searchMode =
        mode;


    pinyinModeButton
        .classList
        .remove(
            "active"
        );


    vietnameseModeButton
        .classList
        .remove(
            "active"
        );


    if (
        mode ===
        "pinyin"
    ) {

        pinyinModeButton
            .classList
            .add(
                "active"
            );

    }

    else {

        vietnameseModeButton
            .classList
            .add(
                "active"
            );
    }


    searchInput.value =
        "";


    searchResults.innerHTML =
        "";


    updateSearchPlaceholder();


    searchInput.focus();
}


// =====================================================
// 30. PLACEHOLDER
// =====================================================

function updateSearchPlaceholder() {

    if (
        !dictionaryLoaded
    ) {

        return;
    }


    if (
        searchMode ===
        "pinyin"
    ) {

        searchInput.placeholder =

            "Nhập Pinyin, ví dụ: ni / ni hao / máng...";

    }

    else {

        searchInput.placeholder =

            "Nhập nghĩa tiếng Việt, ví dụ: bận...";
    }
}


// =====================================================
// 31. MODE BUTTONS
// =====================================================

pinyinModeButton.addEventListener(
    "click",
    function() {

        setSearchMode(
            "pinyin"
        );
    }
);


vietnameseModeButton.addEventListener(
    "click",
    function() {

        setSearchMode(
            "vietnamese"
        );
    }
);


// =====================================================
// 32. HANZI WRITER
// =====================================================

function renderCharacters(word) {

    characterTarget.innerHTML =
        "";


    const characters =
        [...word]
            .filter(
                isChineseCharacter
            );


    characters.forEach(
        function(
            character,
            index
        ) {

            createCharacterCard(
                character,
                index
            );
        }
    );
}


function createCharacterCard(
    character,
    index
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "character-card";


    const writerID =
        "writer-" + index;


    const counterID =
        "counter-" + index;


    card.innerHTML = `

        <div class="character-title">

            ${character}

        </div>


        <div
            id="${writerID}"
            class="writer-box">
        </div>


        <div
            id="${counterID}"
            class="stroke-counter">

            Đang tải dữ liệu nét...

        </div>


        <div class="writer-buttons">

            <button class="animate-all">

                ▶ Xem toàn bộ

            </button>

            <button class="next-stroke">

                → Nét tiếp theo

            </button>

            <button class="restart-stroke">

                ↻ Bắt đầu lại

            </button>

        </div>

    `;


    characterTarget.appendChild(
        card
    );


    const writer =
        HanziWriter.create(
            writerID,
            character,
            {

                width:
                    320,

                height:
                    320,

                padding:
                    20,

                showOutline:
                    false,

                showCharacter:
                    false,

                strokeAnimationSpeed:
                    0.8,

                delayBetweenStrokes:
                    800,

                strokeFadeDuration:
                    0
            }
        );


    let currentStroke =
        0;


    let totalStrokes =
        0;


    HanziWriter
        .loadCharacterData(
            character
        )

        .then(
            function(data) {

                totalStrokes =
                    data
                        .strokes
                        .length;


                updateCounter();
            }
        );


    function updateCounter() {

        document
            .getElementById(
                counterID
            )
            .innerText =

            `Nét ${currentStroke} / ${totalStrokes}`;
    }


    card
        .querySelector(
            ".animate-all"
        )

        .addEventListener(
            "click",
            function() {

                currentStroke =
                    0;


                writer
                    .animateCharacter({

                        onComplete() {

                            currentStroke =
                                totalStrokes;


                            updateCounter();
                        }
                    });


                updateCounter();
            }
        );


    card
        .querySelector(
            ".next-stroke"
        )

        .addEventListener(
            "click",
            function() {

                if (
                    totalStrokes ===
                    0
                ) {

                    return;
                }


                if (
                    currentStroke >=
                    totalStrokes
                ) {

                    currentStroke =
                        0;


                    writer
                        .hideCharacter({

                            duration:
                                0
                        });
                }


                writer
                    .animateStroke(
                        currentStroke
                    );


                currentStroke++;


                updateCounter();
            }
        );


    card
        .querySelector(
            ".restart-stroke"
        )

        .addEventListener(
            "click",
            function() {

                currentStroke =
                    0;


                writer
                    .hideCharacter({

                        duration:
                            0
                    });


                updateCounter();
            }
        );
}


// =====================================================
// 33. SEARCH EVENTS
// =====================================================

searchButton.addEventListener(
    "click",
    searchWord
);


searchInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "Enter"
        ) {

            searchWord();
        }
    }
);


// =====================================================
// 34. PHÁT ÂM
// =====================================================

speakButton.addEventListener(
    "click",
    function() {

        const text =
            hanzi.innerText.trim();


        if (!text) {
            return;
        }


        const speech =
            new SpeechSynthesisUtterance(
                text
            );


        speech.lang =
            "zh-CN";


        speech.rate =
            0.8;


        window
            .speechSynthesis
            .cancel();


        window
            .speechSynthesis
            .speak(
                speech
            );
    }
);


// =====================================================
// 35. START
// =====================================================

loadDictionary();