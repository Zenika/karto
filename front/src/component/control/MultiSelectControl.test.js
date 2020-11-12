import React from 'react';
import MultiSelectControl from './MultiSelectControl';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

function configureMockForPopper() {
    global.document.createRange = () => ({
        setStart: () => {
        },
        setEnd: () => {
        },
        commonAncestorContainer: {
            nodeName: 'BODY',
            ownerDocument: document
        }
    });
}

describe('MultiSelectControl component', () => {

    beforeAll(() => {
        configureMockForPopper();
    });

    it('displays selected options and button to add', () => {
        const placeholder = 'placeholder';
        const options = ['option1', 'option2', 'option3'];
        const selectedOptions = ['option1', 'option2'];
        render(
            <MultiSelectControl name={''} checked={false} placeholder={placeholder} options={options}
                                selectedOptions={selectedOptions} onChange={() => null}/>
        );

        const { queryAllByRole, queryByText, queryByPlaceholderText } = within(screen.queryByRole('combobox'));
        expect(queryAllByRole('button')).toHaveLength(3);
        expect(queryByText(selectedOptions[0])).toBeInTheDocument();
        expect(queryByText(selectedOptions[1])).toBeInTheDocument();
        expect(queryByPlaceholderText(placeholder)).toBeInTheDocument();
    });

    it('calls change handler when new option is selected', () => {
        const placeholder = 'placeholder';
        const options = ['option1', 'option2', 'option3'];
        const selectedOptions = [options[1]];
        const changeHandler = jest.fn();
        render(
            <MultiSelectControl name={''} checked={false} placeholder={placeholder} options={options}
                                selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: options[2] } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([options[1], options[2]]);
    });

    it('clears selection when clear button is clicked', () => {
        const options = ['option1', 'option2'];
        const selectedOptions = [options[1]];
        const changeHandler = jest.fn();
        render(
            <MultiSelectControl name={''} checked={false} placeholder={''} options={options}
                                selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        const clearButton = screen.getByText('Clear');
        fireEvent.click(clearButton);

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([]);
    });

    it('selects all when select all button is clicked', () => {
        const options = ['option1', 'option2'];
        const changeHandler = jest.fn();
        render(
            <MultiSelectControl name={''} checked={false} placeholder={''} options={options}
                                selectedOptions={[]} onChange={changeHandler}/>
        );

        const selectAllButton = screen.getByText('Select all');
        fireEvent.click(selectAllButton);

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith(options);
    });
});
