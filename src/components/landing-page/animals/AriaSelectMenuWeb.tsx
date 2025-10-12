/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Item } from '@react-stately/collections';
import { mergeProps } from '@react-aria/utils';
import { useFocus } from '@react-aria/interactions';
import { useTreeState } from '@react-stately/tree';
import { useMenu, useMenuItem } from '@react-aria/menu';

type MenuProps = {
  children: React.ReactNode;
  onAction?: (key: any) => void;
  'aria-label'?: string;
};

function Menu(props: MenuProps) {
  // Create state based on the incoming props
  // React Aria's TreeState expects CollectionChildren<object>, but we pass ReactNode
  // This is safe because we're using the Item component from @react-stately/collections
  const treeStateProps = {
    children: props.children as any,
    selectionMode: 'none' as const,
  };

  let state = useTreeState(treeStateProps);

  // Get props for the menu element
  let ref = React.useRef<HTMLUListElement>(null);
  // useMenu expects specific props interface, but we only need aria-label
  let { menuProps } = useMenu(
    { 'aria-label': props['aria-label'] } as any,
    state,
    ref as any // Ref type mismatch between React and React Aria
  );

  return (
    <ul {...menuProps} ref={ref} className="-mb-px flex flex-row">
      {[...state.collection].map((item) => (
        <MenuItem
          key={item.key}
          item={item}
          state={state}
          onAction={props.onAction ?? (() => {})}
        />
      ))}
    </ul>
  );
}

type MenuItemProps = {
  item: any;
  state: any;
  onAction: (key: any) => void;
};

function MenuItem({ item, state, onAction }: MenuItemProps) {
  // Get props for the menu item element
  let ref = React.useRef<HTMLLIElement>(null);
  let isDisabled = state.disabledKeys.has(item.key);

  // useMenuItem expects a more complex props interface than what we provide
  // and a RefObject<FocusableElement> but we provide RefObject<HTMLLIElement>
  let { menuItemProps } = useMenuItem(
    {
      key: item.key,
      isDisabled,
      onAction: onAction ?? (() => {}),
    } as any,
    state,
    ref as any
  );

  // Handle focus events so we can apply highlighted
  // style to the focused menu item
  let [isFocused, setFocused] = React.useState(false);
  let { focusProps } = useFocus({ onFocusChange: setFocused });

  const selectedStyle = 'border-gold-500 border-b-2 text-gold-600';
  const unselectedStyle =
    'border-white border-b-2  text-white hover:text-gold-700 hover:border-gold-500';

  return (
    <li
      {...mergeProps(menuItemProps, focusProps)}
      ref={ref}
      className={`${
        isFocused ? selectedStyle : unselectedStyle
      } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-base cursor-pointer`}
    >
      {item.rendered}
    </li>
  );
}
type AriaSelecMenuWebProps = {
  setAnimal: (animal: string) => void;
};

export default function AriaSelecMenuWeb({ setAnimal }: AriaSelecMenuWebProps) {
  return (
    <div className="hidden sm:block ">
      <Menu onAction={setAnimal} aria-label="Tabs">
        <Item key="chien">Le chien</Item>
        <Item key="chat">Le chat</Item>
        <Item key="cheval">Le cheval</Item>
        <Item key="vache">La vache</Item>
        <Item key="nac">N.A.C.</Item>
      </Menu>
    </div>
  );
}
