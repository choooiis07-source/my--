// 의상 아이템 데이터
const clothingData = {
    hair: [
        { id: 'default', name: '기본 머리', emoji: '👩', class: 'default-hair' },
        { id: 'long', name: '긴 머리', emoji: '👩‍🦰', class: 'hair-long' },
        { id: 'short', name: '단발', emoji: '💇‍♀️', class: 'hair-short' },
        { id: 'twin', name: '트윈테일', emoji: '👧', class: 'hair-twin' },
        { id: 'bob', name: '보브컷', emoji: '👩‍🦱', class: 'hair-bob' }
    ],
    top: [
        { id: 'none', name: '없음', emoji: '❌', class: '' },
        { id: 'basic', name: '기본 티', emoji: '👕', class: 'top-basic' },
        { id: 'dress', name: '원피스', emoji: '👗', class: 'top-dress' },
        { id: 'hoodie', name: '후드티', emoji: '🧥', class: 'top-hoodie' },
        { id: 'elegant', name: '우아한 블라우스', emoji: '👚', class: 'top-elegant' },
        { id: 'sailor', name: '선복', emoji: '⚓', class: 'top-sailor' }
    ],
    bottom: [
        { id: 'none', name: '없음', emoji: '❌', class: '' },
        { id: 'basic', name: '기본 바지', emoji: '👖', class: 'bottom-basic' },
        { id: 'skirt', name: '치마', emoji: '🩳', class: 'bottom-skirt' },
        { id: 'skirt-long', name: '롱스커트', emoji: '👗', class: 'bottom-skirt-long' },
        { id: 'shorts', name: '반바지', emoji: '🩳', class: 'bottom-shorts' },
        { id: 'jeans', name: '청바지', emoji: '👖', class: 'bottom-jeans' }
    ],
    shoes: [
        { id: 'none', name: '없음', emoji: '❌', class: '' },
        { id: 'basic', name: '기본 신발', emoji: '👞', class: '' },
        { id: 'sneakers', name: '운동화', emoji: '👟', class: 'shoes-sneakers' },
        { id: 'heels', name: '하이힐', emoji: '👠', class: 'shoes-heels' },
        { id: 'boots', name: '부츠', emoji: '👢', class: 'shoes-boots' },
        { id: 'sandals', name: '샌들', emoji: '👡', class: 'shoes-sandals' }
    ],
    accessory: [
        { id: 'none', name: '없음', emoji: '❌', class: '' },
        { id: 'bow', name: '리본', emoji: '🎀', class: 'accessory-bow' },
        { id: 'crown', name: '왕관', emoji: '👑', class: 'accessory-crown' },
        { id: 'glasses', name: '안경', emoji: '👓', class: 'accessory-glasses' },
        { id: 'necklace', name: '목걸이', emoji: '📿', class: 'accessory-necklace' }
    ]
};

// 현재 선택된 아이템 상태
let currentOutfit = {
    hair: 'default',
    top: 'none',
    bottom: 'none',
    shoes: 'none',
    accessory: 'none'
};

// 현재 선택된 카테고리
let currentCategory = 'hair';

// 저장된 코디 목록
let savedOutfits = JSON.parse(localStorage.getItem('savedOutfits')) || [];

// DOM 요소
const clothingItemsContainer = document.getElementById('clothing-items');
const outfitTop = document.getElementById('outfit-top');
const outfitBottom = document.getElementById('outfit-bottom');
const outfitShoes = document.getElementById('outfit-shoes');
const outfitAccessory = document.getElementById('outfit-accessory');
const outfitsGrid = document.getElementById('outfits-grid');

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    renderClothingItems();
    setupActionButtons();
    renderSavedOutfits();
});

// 탭 설정
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 활성 탭 변경
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 카테고리 변경
            currentCategory = btn.dataset.category;
            renderClothingItems();
        });
    });
}

// 의상 아이템 렌더링
function renderClothingItems() {
    const items = clothingData[currentCategory];
    clothingItemsContainer.innerHTML = '';
    
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'clothing-item';
        itemElement.dataset.id = item.id;
        itemElement.innerHTML = `<span>${item.emoji}</span>`;
        itemElement.title = item.name;
        
        // 현재 선택된 아이템 표시
        if (currentOutfit[currentCategory] === item.id) {
            itemElement.classList.add('selected');
        }
        
        itemElement.addEventListener('click', () => selectItem(item));
        clothingItemsContainer.appendChild(itemElement);
    });
}

// 아이템 선택
function selectItem(item) {
    currentOutfit[currentCategory] = item.id;
    updateCharacter();
    renderClothingItems();
}

// 캐릭터 업데이트
function updateCharacter() {
    // 헤어 업데이트
    const hairElement = document.querySelector('.hair');
    hairElement.className = 'hair';
    const hairItem = clothingData.hair.find(h => h.id === currentOutfit.hair);
    if (hairItem) {
        hairElement.classList.add(hairItem.class);
    }
    
    // 상의 업데이트
    outfitTop.className = 'outfit-top';
    const topItem = clothingData.top.find(t => t.id === currentOutfit.top);
    if (topItem && topItem.class) {
        outfitTop.classList.add(topItem.class);
    }
    
    // 하의 업데이트
    outfitBottom.className = 'outfit-bottom';
    const bottomItem = clothingData.bottom.find(b => b.id === currentOutfit.bottom);
    if (bottomItem && bottomItem.class) {
        outfitBottom.classList.add(bottomItem.class);
    }
    
    // 신발 업데이트
    outfitShoes.className = 'outfit-shoes';
    const shoesItem = clothingData.shoes.find(s => s.id === currentOutfit.shoes);
    if (shoesItem && shoesItem.class) {
        outfitShoes.classList.add(shoesItem.class);
    }
    
    // 액세서리 업데이트
    outfitAccessory.className = 'body-part accessory';
    const accessoryItem = clothingData.accessory.find(a => a.id === currentOutfit.accessory);
    if (accessoryItem && accessoryItem.class) {
        outfitAccessory.classList.add(accessoryItem.class);
    }
}

// 액션 버튼 설정
function setupActionButtons() {
    // 초기화 버튼
    document.getElementById('reset-btn').addEventListener('click', resetOutfit);
    
    // 랜덤 버튼
    document.getElementById('random-btn').addEventListener('click', randomOutfit);
    
    // 저장 버튼
    document.getElementById('save-btn').addEventListener('click', saveOutfit);
}

// 초기화
function resetOutfit() {
    currentOutfit = {
        hair: 'default',
        top: 'none',
        bottom: 'none',
        shoes: 'none',
        accessory: 'none'
    };
    updateCharacter();
    renderClothingItems();
}

// 랜덤 코디
function randomOutfit() {
    const categories = Object.keys(clothingData);
    categories.forEach(category => {
        const items = clothingData[category];
        const randomIndex = Math.floor(Math.random() * items.length);
        currentOutfit[category] = items[randomIndex].id;
    });
    updateCharacter();
    renderClothingItems();
}

// 코디 저장
function saveOutfit() {
    const outfitName = `코디 ${savedOutfits.length + 1}`;
    const newOutfit = {
        id: Date.now(),
        name: outfitName,
        items: { ...currentOutfit }
    };
    
    savedOutfits.push(newOutfit);
    localStorage.setItem('savedOutfits', JSON.stringify(savedOutfits));
    renderSavedOutfits();
    
    // 저장 완료 애니메이션
    const saveBtn = document.getElementById('save-btn');
    saveBtn.textContent = '✅ 저장완료!';
    setTimeout(() => {
        saveBtn.textContent = '💾 저장';
    }, 1000);
}

// 저장된 코디 렌더링
function renderSavedOutfits() {
    outfitsGrid.innerHTML = '';
    
    if (savedOutfits.length === 0) {
        outfitsGrid.innerHTML = '<p style="color: #999; text-align: center;">저장된 코디가 없습니다</p>';
        return;
    }
    
    savedOutfits.forEach(outfit => {
        const outfitElement = document.createElement('div');
        outfitElement.className = 'saved-outfit';
        outfitElement.dataset.id = outfit.id;
        
        // 미리보기 이모지 생성
        const topItem = clothingData.top.find(t => t.id === outfit.items.top);
        const previewEmoji = topItem ? topItem.emoji : '👤';
        
        outfitElement.innerHTML = `
            <div class="outfit-preview">${previewEmoji}</div>
            <div class="outfit-label">${outfit.name}</div>
            <button class="delete-btn" onclick="deleteOutfit(${outfit.id})">✕</button>
        `;
        
        outfitElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn')) {
                loadOutfit(outfit.items);
            }
        });
        
        outfitsGrid.appendChild(outfitElement);
    });
}

// 저장된 코디 불러오기
function loadOutfit(items) {
    currentOutfit = { ...items };
    updateCharacter();
    renderClothingItems();
    
    // 해당 카테고리로 탭 전환
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === 'hair') {
            btn.classList.add('active');
            currentCategory = 'hair';
            renderClothingItems();
        }
    });
}

// 저장된 코디 삭제
function deleteOutfit(id) {
    if (confirm('이 코디를 삭제하시겠습니까?')) {
        savedOutfits = savedOutfits.filter(outfit => outfit.id !== id);
        localStorage.setItem('savedOutfits', JSON.stringify(savedOutfits));
        renderSavedOutfits();
    }
}